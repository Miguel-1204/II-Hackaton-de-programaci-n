/**
 * @fileoverview Servicio de negocio para la gestión de transformaciones, validación de inventario e idempotencia.
 */

const { cantidadAKg } = require('../utils/conversion')

function normalizeList(items, fields) {
  return (items || [])
    .map((item) => Object.fromEntries(fields.map((field) => [
      field,
      field === 'observaciones'
        ? item[field] || null
        : field === 'concepto' || field === 'moneda' || field === 'unidad'
          ? String(item[field] || '').toUpperCase()
          : Number(item[field]),
    ])))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    )
}

function sameIdempotentRequest(existing, request) {
  if (!existing || !Array.isArray(existing.participaciones)) return true
  const entries = existing.participaciones
    .filter((item) => item.tipoParticipacion === 'ENTRADA')
    .map(({ loteId, cantidad, unidad }) => ({ loteId, cantidad, unidad }))
  const outputs = existing.participaciones
    .filter((item) => item.tipoParticipacion === 'SALIDA')
    .map(({ loteId, cantidad, unidad }) => ({ loteId, cantidad, unidad }))
  const costs = (existing.solicitudInicial?.costos || existing.costos || [])
    .map(({ concepto, valor, moneda, observaciones }) => ({
    concepto,
    valor,
    moneda,
    observaciones,
    }))
  const auditedOutputs = existing.solicitudInicial?.lotesSalida
  const requestedOutputs = request.lotesSalida.map(({ loteId, cantidad, unidad }) => ({
    loteId: loteId || null, cantidad, unidad,
  }))
  const comparableOutputs = auditedOutputs || outputs
  return existing.codigo === request.codigo &&
    existing.etapa === request.etapa &&
    existing.estado === request.estado &&
    JSON.stringify(normalizeList(entries, ['loteId', 'cantidad', 'unidad'])) ===
      JSON.stringify(normalizeList(request.lotesEntrada, ['loteId', 'cantidad', 'unidad'])) &&
    JSON.stringify(normalizeList(comparableOutputs.map(({ loteId, cantidad, unidad }) => ({ loteId: loteId || null, cantidad, unidad })), ['loteId', 'cantidad', 'unidad'])) ===
      JSON.stringify(normalizeList(requestedOutputs, ['loteId', 'cantidad', 'unidad'])) &&
    JSON.stringify(normalizeList(costs, ['concepto', 'valor', 'moneda', 'observaciones'])) ===
      JSON.stringify(normalizeList(request.costos, ['concepto', 'valor', 'moneda', 'observaciones']))
}

/**
 * Factoría que instancia el servicio de transformaciones.
 *
 * @param {Object} dependencies - Dependencias inyectadas.
 * @param {Object} dependencies.transformacionesModel - Modelo de transformaciones.
 * @param {Object} dependencies.lotesModel - Modelo de lotes.
 * @returns {Object} Métodos de negocio para transformaciones.
 */
function createTransformacionesService({ transformacionesModel, lotesModel }) {
  if (!transformacionesModel || !lotesModel) {
    throw new Error('transformacionesModel y lotesModel son dependencias obligatorias')
  }

  return {
    /**
     * Registra un proceso de transformación validando existencias, estado de los lotes e idempotencia.
     *
     * @param {Object} data - Datos de la transformación validados.
     * @param {string} data.codigo - Código único del proceso.
     * @param {string} data.etapa - Etapa (ej. FERMENTACION, SECADO, TOSTADO).
     * @param {number} data.responsableId - ID del usuario responsable.
     * @param {string} [data.observaciones] - Observaciones técnicas.
     * @param {string} data.estado - Estado de la transformación.
     * @param {string} [data.claveIdempotencia] - Clave de idempotencia única.
     * @param {Array<{ loteId: number, cantidad: number, unidad: string }>} data.lotesEntrada - Lotes de entrada.
     * @param {Array<{ loteId: number, cantidad: number, unidad: string }>} data.lotesSalida - Lotes de salida.
     * @param {Array<Object>} [data.costos] - Costos iniciales.
     * @returns {Promise<{ transformacion: Object, merma: Object|null, alertaGenerada: boolean, idempotente: boolean }>}
     */
    async createTransformacion(data) {
      // 1. Verificación de idempotencia previa
      if (data.claveIdempotencia) {
        const existente = await transformacionesModel.findByClaveIdempotencia(data.claveIdempotencia)
        if (existente) {
          const detalle = await transformacionesModel.findById(existente.id)
          if (!sameIdempotentRequest(detalle, data)) {
            const err = new Error('La clave de idempotencia ya fue usada con otros datos')
            err.statusCode = 409
            throw err
          }
          return {
            transformacion: detalle,
            merma: detalle?.analiticaMerma || null,
            alertaGenerada: false,
            idempotente: true,
          }
        }
      }

      // 2. Validación de existencia y disponibilidad de lotes de entrada
      for (const input of data.lotesEntrada) {
        const lote = await lotesModel.findById(input.loteId)
        if (!lote) {
          const err = new Error(`El lote de entrada con ID ${input.loteId} no existe en el sistema`)
          err.statusCode = 404
          throw err
        }

        // Verificar si el lote está bloqueado
        if (lote.estado === 'BLOQUEADO') {
          const err = new Error(
            `El lote de entrada ${lote.codigo} (ID: ${lote.id}) se encuentra BLOQUEADO por aseguramiento de calidad y no puede ser procesado`,
          )
          err.statusCode = 400
          throw err
        }

        // Verificar saldo de inventario si está disponible
        const saldoInfo = await lotesModel.getSaldoInventario(input.loteId)
        const inputKg = cantidadAKg(input.cantidad, input.unidad)
        if (inputKg === null) {
          const err = new Error(`La unidad del lote ${lote.codigo} no es comparable con el inventario`)
          err.statusCode = 400
          throw err
        }
        if (saldoInfo && saldoInfo.saldoInventarioKg !== null) {
          if (saldoInfo.saldoInventarioKg < inputKg) {
            const err = new Error(
              `Saldo insuficiente en el lote ${lote.codigo}. Saldo disponible: ${saldoInfo.saldoInventarioKg} kg, requerido: ${inputKg} kg`,
            )
            err.statusCode = 400
            throw err
          }
        }
      }

      // 3. Validación de lotes de salida
      for (const output of data.lotesSalida) {
        if (!output.loteId) continue
        const lote = await lotesModel.findById(output.loteId)
        if (!lote) {
          const err = new Error(`El lote de salida con ID ${output.loteId} no existe en el sistema`)
          err.statusCode = 404
          throw err
        }
      }

      // 4. Ejecución del registro transaccional
      const result = await transformacionesModel.create(data)
      if (result.idempotente && !sameIdempotentRequest(result.transformacion, data)) {
        const err = new Error('La clave de idempotencia ya fue usada con otros datos')
        err.statusCode = 409
        throw err
      }

      return {
        ...result,
        idempotente: result.idempotente ?? false,
      }
    },

    /**
     * Consulta una transformación por su ID.
     *
     * @param {number} id - ID de la transformación.
     * @returns {Promise<Object>} Detalle de la transformación.
     */
    async getTransformacionById(id) {
      const trans = await transformacionesModel.findById(id)
      if (!trans) {
        const err = new Error(`Transformación con ID ${id} no encontrada`)
        err.statusCode = 404
        throw err
      }
      return trans
    },

    /**
     * Lista transformaciones registradas.
     *
     * @param {number} [limit=50] - Cantidad máxima a listar.
     * @returns {Promise<Array<Object>>}
     */
    async listTransformaciones(limit = 50) {
      return await transformacionesModel.list(limit)
    },
  }
}

module.exports = {
  createTransformacionesService,
  sameIdempotentRequest,
}
