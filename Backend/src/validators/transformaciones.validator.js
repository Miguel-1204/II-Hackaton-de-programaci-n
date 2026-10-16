/**
 * @fileoverview Validador de esquemas de entrada para transformaciones y participaciones de lotes.
 */

/**
 * Valida el cuerpo de la petición para registrar una nueva transformación.
 *
 * @param {unknown} body - Cuerpo de la solicitud recibido en Express.
 * @returns {{ value?: {
 *   codigo: string,
 *   etapa: string,
 *   observaciones?: string,
 *   estado: string,
 *   claveIdempotencia?: string,
 *   lotesEntrada: Array<{ loteId: number, cantidad: number, unidad: string }>,
 *   lotesSalida: Array<{ loteId: number, cantidad: number, unidad: string }>,
 *   costos?: Array<{ concepto: string, valor: number, moneda: string, observaciones?: string }>
 * }, error?: string }} Objeto con el valor sanitizado o mensaje de error.
 */
function validateCreateTransformacionBody(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'El cuerpo de la solicitud debe ser un objeto JSON válido' }
  }

  const {
    codigo,
    etapa,
    observaciones,
    estado = 'COMPLETADA',
    claveIdempotencia,
    lotesEntrada,
    lotesSalida,
    costos,
  } = body

  if (typeof codigo !== 'string' || !codigo.trim()) {
    return { error: 'El campo "codigo" es obligatorio y debe ser una cadena no vacía' }
  }

  if (typeof etapa !== 'string' || !etapa.trim()) {
    return { error: 'El campo "etapa" es obligatorio y debe ser una cadena no vacía' }
  }

  if (typeof estado !== 'string' || !estado.trim()) {
    return { error: 'El campo "estado" debe ser una cadena no vacía' }
  }

  if (claveIdempotencia !== undefined && (typeof claveIdempotencia !== 'string' || !claveIdempotencia.trim())) {
    return { error: 'Si se provee "claveIdempotencia", debe ser una cadena no vacía' }
  }

  if (!Array.isArray(lotesEntrada) || lotesEntrada.length === 0) {
    return { error: 'Se requiere al menos un lote de entrada en "lotesEntrada"' }
  }

  for (let i = 0; i < lotesEntrada.length; i++) {
    const item = lotesEntrada[i]
    if (!item || typeof item !== 'object') {
      return { error: `El elemento en lotesEntrada[${i}] debe ser un objeto` }
    }
    const loteId = Number(item.loteId)
    const cantidad = Number(item.cantidad)
    const unidad = typeof item.unidad === 'string' ? item.unidad.trim() : ''

    if (!Number.isSafeInteger(loteId) || loteId <= 0) {
      return { error: `lotesEntrada[${i}].loteId debe ser un ID numérico entero positivo` }
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return { error: `lotesEntrada[${i}].cantidad debe ser un número estrictamente positivo` }
    }
    if (!unidad) {
      return { error: `lotesEntrada[${i}].unidad es obligatoria` }
    }
  }

  if (!Array.isArray(lotesSalida) || lotesSalida.length === 0) {
    return { error: 'Se requiere al menos un lote de salida en "lotesSalida"' }
  }

  for (let i = 0; i < lotesSalida.length; i++) {
    const item = lotesSalida[i]
    if (!item || typeof item !== 'object') {
      return { error: `El elemento en lotesSalida[${i}] debe ser un objeto` }
    }
    const loteId = Number(item.loteId)
    const cantidad = Number(item.cantidad)
    const unidad = typeof item.unidad === 'string' ? item.unidad.trim() : ''

    if (!Number.isSafeInteger(loteId) || loteId <= 0) {
      return { error: `lotesSalida[${i}].loteId debe ser un ID numérico entero positivo` }
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return { error: `lotesSalida[${i}].cantidad debe ser un número estrictamente positivo` }
    }
    if (!unidad) {
      return { error: `lotesSalida[${i}].unidad es obligatoria` }
    }
  }

  const sanitizedCostos = []
  if (costos !== undefined) {
    if (!Array.isArray(costos)) {
      return { error: 'El campo "costos" debe ser un arreglo de objetos de costo' }
    }
    for (let i = 0; i < costos.length; i++) {
      const c = costos[i]
      if (!c || typeof c !== 'object') {
        return { error: `costos[${i}] debe ser un objeto` }
      }
      const concepto = typeof c.concepto === 'string' ? c.concepto.trim() : ''
      const valor = Number(c.valor)
      const moneda = typeof c.moneda === 'string' ? c.moneda.trim() : ''

      if (!concepto) {
        return { error: `costos[${i}].concepto es obligatorio` }
      }
      if (!Number.isFinite(valor) || valor < 0) {
        return { error: `costos[${i}].valor debe ser un número no negativo` }
      }
      if (!moneda) {
        return { error: `costos[${i}].moneda es obligatoria (ej. COP, USD)` }
      }

      sanitizedCostos.push({
        concepto,
        valor,
        moneda: moneda.toUpperCase(),
        observaciones: typeof c.observaciones === 'string' ? c.observaciones.trim() : undefined,
      })
    }
  }

  return {
    value: {
      codigo: codigo.trim(),
      etapa: etapa.trim().toUpperCase(),
      observaciones: typeof observaciones === 'string' ? observaciones.trim() : undefined,
      estado: estado.trim().toUpperCase(),
      claveIdempotencia: claveIdempotencia ? claveIdempotencia.trim() : undefined,
      lotesEntrada: lotesEntrada.map((item) => ({
        loteId: Number(item.loteId),
        cantidad: Number(item.cantidad),
        unidad: item.unidad.trim().toLowerCase(),
      })),
      lotesSalida: lotesSalida.map((item) => ({
        loteId: Number(item.loteId),
        cantidad: Number(item.cantidad),
        unidad: item.unidad.trim().toLowerCase(),
      })),
      costos: sanitizedCostos.length > 0 ? sanitizedCostos : undefined,
    },
  }
}

module.exports = {
  validateCreateTransformacionBody,
}
