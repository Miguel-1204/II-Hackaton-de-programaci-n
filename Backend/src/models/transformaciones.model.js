/**
 * @fileoverview Modelo de datos para transformaciones, participaciones, inventario e incidencias automáticas.
 */

const { eq, sql } = require('drizzle-orm')
const {
  transformaciones,
  transformacionLotes,
  movimientosInventario,
  costosTransformacion,
  incidencias,
  auditoriaEventos,
  lotes,
} = require('../db/schema')
const { lockAndValidateInventory } = require('./lotes.model')

/**
 * Factoría que instancia el modelo de transformaciones con soporte de transacciones e idempotencia.
 *
 * @param {import('drizzle-orm/postgres-js').PostgresJsDatabase} db - Instancia de Drizzle ORM.
 * @returns {Object} Métodos de gestión de transformaciones.
 */
function createTransformacionesModel(db) {
  if (!db) {
    throw new Error('La instancia de base de datos es requerida para el modelo de transformaciones')
  }

  return {
    /**
     * Busca una transformación por su clave de idempotencia única.
     *
     * @param {string} claveIdempotencia - Clave única de la operación.
     * @returns {Promise<Object|null>} Transformación encontrada o null.
     */
    async findByClaveIdempotencia(claveIdempotencia) {
      if (!claveIdempotencia) return null
      const rows = await db
        .select()
        .from(transformaciones)
        .where(eq(transformaciones.claveIdempotencia, claveIdempotencia))
        .limit(1)

      return rows[0] || null
    },

    /**
     * Busca una transformación por ID incluyendo sus participaciones y costos asociados.
     *
     * @param {number} id - Identificador de la transformación.
     * @returns {Promise<Object|null>} Detalle completo de la transformación o null.
     */
    async findById(id) {
      const [trans] = await db
        .select()
        .from(transformaciones)
        .where(eq(transformaciones.id, id))
        .limit(1)

      if (!trans) return null

      const lotesRows = await db
        .select()
        .from(transformacionLotes)
        .where(eq(transformacionLotes.transformacionId, id))

      const costosRows = await db
        .select()
        .from(costosTransformacion)
        .where(eq(costosTransformacion.transformacionId, id))

      const [mermaRow] = await db.execute(sql`
        SELECT
          transformacion_id,
          entradas_registradas,
          salidas_registradas,
          estado_evaluacion,
          entrada_kg,
          salida_kg,
          merma_kg,
          merma_porcentaje,
          umbral_porcentaje,
          supera_umbral
        FROM analitica_transformacion_merma
        WHERE transformacion_id = ${id}
        LIMIT 1
      `)
      const [auditRow] = await db
        .select({ valoresNuevos: auditoriaEventos.valoresNuevos })
        .from(auditoriaEventos)
        .where(sql`
          ${auditoriaEventos.entidad} = 'TRANSFORMACION'
          AND ${auditoriaEventos.entidadId} = ${String(id)}
          AND ${auditoriaEventos.operacion} = 'CREACION'
        `)
        .limit(1)

      return {
        ...trans,
        participaciones: lotesRows,
        costos: costosRows,
        solicitudInicial: auditRow?.valoresNuevos || null,
        analiticaMerma: mermaRow || null,
      }
    },

    /**
     * Lista transformaciones ordenadas por fecha descendente.
     *
     * @param {number} [limit=50] - Cantidad máxima de registros.
     * @returns {Promise<Array<Object>>} Lista de transformaciones con analítica de merma.
     */
    async list(limit = 50) {
      const rows = await db.execute(sql`
        SELECT
          t.id,
          t.codigo,
          t.etapa,
          t.responsable_id,
          t.fecha,
          t.observaciones,
          t.estado,
          t.clave_idempotencia,
          atm.estado_evaluacion,
          atm.entrada_kg,
          atm.salida_kg,
          atm.merma_kg,
          atm.merma_porcentaje,
          atm.supera_umbral
        FROM transformaciones t
        LEFT JOIN analitica_transformacion_merma atm ON atm.transformacion_id = t.id
        ORDER BY t.fecha DESC
        LIMIT ${limit}
      `)

      return rows || []
    },

    /**
     * Registra de forma transaccional una transformación con sus lotes de entrada/salida,
     * movimientos de inventario asociados, costos, evaluación analítica de merma
     * y generación automática de incidencias si la merma supera el umbral del 15%.
     *
     * @param {Object} data - Datos de la transformación.
     * @param {string} data.codigo - Código de la transformación.
     * @param {string} data.etapa - Etapa del proceso.
     * @param {number} data.responsableId - ID del usuario responsable.
     * @param {string} [data.observaciones] - Observaciones adicionales.
     * @param {string} data.estado - Estado de la transformación.
     * @param {string} [data.claveIdempotencia] - Clave de idempotencia única.
     * @param {Array<{ loteId: number, cantidad: number, unidad: string }>} data.lotesEntrada - Lotes consumidos.
     * @param {Array<{ loteId: number, cantidad: number, unidad: string }>} data.lotesSalida - Lotes producidos.
     * @param {Array<{ concepto: string, valor: number, moneda: string, observaciones?: string }>} [data.costos] - Costos incurridos.
     * @returns {Promise<{ transformacion: Object, merma: Object|null, alertaGenerada: boolean }>}
     */
    async create(data) {
      try {
        return await db.transaction(async (tx) => {
        await lockAndValidateInventory(tx, {
          consumptions: data.lotesEntrada,
          lotIds: data.lotesSalida.filter(({ loteId }) => loteId).map(({ loteId }) => loteId),
        })

        // 1. Inserción de la transformación
        const [trans] = await tx
          .insert(transformaciones)
          .values({
            codigo: data.codigo,
            etapa: data.etapa,
            responsableId: data.responsableId,
            observaciones: data.observaciones,
            estado: data.estado,
            claveIdempotencia: data.claveIdempotencia,
          })
          .returning()

        const baseKey = data.claveIdempotencia || `trans_${trans.id}_${Date.now()}`

        // 2. Inserción de participaciones de ENTRADA y movimientos de inventario de SALIDA
        for (const input of data.lotesEntrada) {
          await tx.insert(transformacionLotes).values({
            transformacionId: trans.id,
            loteId: input.loteId,
            tipoParticipacion: 'ENTRADA',
            cantidad: input.cantidad,
            unidad: input.unidad,
          })

          await tx.insert(movimientosInventario).values({
            loteId: input.loteId,
            transformacionId: trans.id,
            usuarioId: data.responsableId,
            tipoMovimiento: 'SALIDA',
            cantidad: input.cantidad,
            unidad: input.unidad,
            claveIdempotencia: `${baseKey}_mov_salida_lote_${input.loteId}`,
          })
        }

        // Las salidas nuevas heredan productor y clasificación del lote de entrada.
        const inputsInfo = await tx.execute(sql`
          SELECT DISTINCT productor_id, producto_id, tipo_material
          FROM lotes
          WHERE id IN (${sql.join(data.lotesEntrada.map(({ loteId }) => sql`${loteId}`), sql`, `)})
        `)
        const productoresOrigen = new Set(inputsInfo.map((row) => Number(row.productor_id)))
        if (data.lotesSalida.some(({ loteId }) => !loteId) && productoresOrigen.size !== 1) {
          const error = new Error('Para crear lotes de salida, todas las entradas deben pertenecer al mismo productor.')
          error.statusCode = 409
          throw error
        }
        const origen = inputsInfo[0]
        const lotesSalidaCreados = []

        // 3. Inserción de participaciones de SALIDA y movimientos de inventario de ENTRADA
        for (const [index, output] of data.lotesSalida.entries()) {
          let outputLotId = output.loteId
          if (!outputLotId) {
            const codigoSalida = `${data.codigo}-OUT-${String(index + 1).padStart(2, '0')}`
            const [newLot] = await tx.insert(lotes).values({
              codigo: codigoSalida,
              productorId: origen.productor_id,
              productoId: origen.producto_id,
              tipoMaterial: origen.tipo_material,
              cantidadRecibida: output.cantidad,
              unidad: output.unidad,
              estado: 'PENDIENTE',
            }).returning({ id: lotes.id })
            outputLotId = newLot.id
            lotesSalidaCreados.push({ id: outputLotId, codigo: codigoSalida })
          }
          await tx.insert(transformacionLotes).values({
            transformacionId: trans.id,
            loteId: outputLotId,
            tipoParticipacion: 'SALIDA',
            cantidad: output.cantidad,
            unidad: output.unidad,
          })

          await tx.insert(movimientosInventario).values({
            loteId: outputLotId,
            transformacionId: trans.id,
            usuarioId: data.responsableId,
            tipoMovimiento: 'ENTRADA',
            cantidad: output.cantidad,
            unidad: output.unidad,
            claveIdempotencia: `${baseKey}_mov_entrada_lote_${outputLotId}`,
          })
        }

        // 4. Inserción de costos si aplican
        if (Array.isArray(data.costos) && data.costos.length > 0) {
          for (const costo of data.costos) {
            await tx.insert(costosTransformacion).values({
              transformacionId: trans.id,
              concepto: costo.concepto,
              valor: costo.valor,
              moneda: costo.moneda,
              observaciones: costo.observaciones,
            })
          }
        }

        await tx.insert(auditoriaEventos).values({
          usuarioId: data.responsableId,
          entidad: 'TRANSFORMACION',
          entidadId: String(trans.id),
          operacion: 'CREACION',
          valoresNuevos: {
            codigo: trans.codigo,
            etapa: trans.etapa,
            estado: trans.estado,
            lotesEntrada: data.lotesEntrada.map(({ loteId, cantidad, unidad }) => ({
              loteId,
              cantidad,
              unidad,
            })),
            lotesSalida: data.lotesSalida.map(({ loteId, cantidad, unidad }, index) => ({
              loteId: loteId || null,
              codigo: loteId ? null : `${data.codigo}-OUT-${String(index + 1).padStart(2, '0')}`,
              cantidad,
              unidad,
            })),
            costos: (data.costos || []).map(({ concepto, valor, moneda }) => ({
              concepto,
              valor,
              moneda,
            })),
          },
          correlacionId: data.claveIdempotencia || `transformacion:${trans.id}`,
        })

        // 5. Evaluación de merma a través de la vista analítica
        const [merma] = await tx.execute(sql`
          SELECT
            transformacion_id,
            estado_evaluacion,
            entrada_kg,
            salida_kg,
            merma_kg,
            merma_porcentaje,
            umbral_porcentaje,
            supera_umbral
          FROM analitica_transformacion_merma
          WHERE transformacion_id = ${trans.id}
          LIMIT 1
        `)

        let alertaGenerada = false
        // 6. Si la merma supera el umbral estricto del 15%, generar incidencia automática
        if (merma && merma.supera_umbral === true) {
          const primerLoteEntrada = data.lotesEntrada[0].loteId
          const porcentajeFmt = Number(merma.merma_porcentaje).toFixed(2)

          await tx.insert(incidencias).values({
            loteId: primerLoteEntrada,
            transformacionId: trans.id,
            usuarioId: data.responsableId,
            tipo: 'MERMA_EXCESIVA',
            descripcion: `Alerta automática del sistema Kaotrace: La merma calculada (${porcentajeFmt} %) superó estrictamente el umbral operativo del 15 %. Entrada: ${merma.entrada_kg} kg, Salida: ${merma.salida_kg} kg, Pérdida: ${merma.merma_kg} kg.`,
            severidad: 'ALTA',
            estado: 'ABIERTA',
          })
          alertaGenerada = true
        }

        return {
          transformacion: trans,
          lotesSalidaCreados,
          merma: merma || null,
          alertaGenerada,
        }
        })
      } catch (error) {
        const databaseError = error.cause || error
        if (data.claveIdempotencia && databaseError.code === '23505') {
          const existing = await this.findByClaveIdempotencia(data.claveIdempotencia)
          if (existing) {
            const detail = await this.findById(existing.id)
            return {
              transformacion: detail,
              merma: detail?.analiticaMerma || null,
              alertaGenerada: false,
              idempotente: true,
            }
          }
        }
        throw error
      }
    },
  }
}

module.exports = {
  createTransformacionesModel,
}
