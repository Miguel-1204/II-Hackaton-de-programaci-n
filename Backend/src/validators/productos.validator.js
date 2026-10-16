/**
 * @fileoverview Validador de esquemas para productos del catálogo y costos de transformación.
 */

/**
 * Valida el cuerpo para la creación o actualización de un producto en el catálogo comercial.
 *
 * @param {unknown} body - Cuerpo de la solicitud.
 * @returns {{ value?: {
 *   codigo: string,
 *   nombre: string,
 *   descripcion?: string,
 *   precioReferencia?: number,
 *   unidadComercial?: string
 * }, error?: string }}
 */
function validateCreateProductoBody(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'El cuerpo de la solicitud debe ser un objeto JSON válido' }
  }

  const { codigo, nombre, descripcion, precioReferencia, unidadComercial } = body

  if (typeof codigo !== 'string' || !codigo.trim()) {
    return { error: 'El campo "codigo" es obligatorio y debe ser una cadena no vacía' }
  }

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return { error: 'El campo "nombre" es obligatorio y debe ser una cadena no vacía' }
  }

  let sanitizedPrecio = undefined
  if (precioReferencia !== undefined && precioReferencia !== null) {
    const num = Number(precioReferencia)
    if (!Number.isFinite(num) || num < 0) {
      return { error: 'El campo "precioReferencia" debe ser un número mayor o igual a cero' }
    }
    sanitizedPrecio = num
  }

  return {
    value: {
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      descripcion: typeof descripcion === 'string' ? descripcion.trim() : undefined,
      precioReferencia: sanitizedPrecio,
      unidadComercial: typeof unidadComercial === 'string' ? unidadComercial.trim() : undefined,
    },
  }
}

/**
 * Valida el cuerpo para registrar un costo en una transformación.
 *
 * @param {unknown} body - Cuerpo de la solicitud.
 * @returns {{ value?: {
 *   concepto: string,
 *   valor: number,
 *   moneda: string,
 *   observaciones?: string
 * }, error?: string }}
 */
function validateCreateCostoBody(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'El cuerpo de la solicitud debe ser un objeto JSON válido' }
  }

  const { concepto, valor, moneda, observaciones } = body

  if (typeof concepto !== 'string' || !concepto.trim()) {
    return { error: 'El campo "concepto" es obligatorio' }
  }

  const numValor = Number(valor)
  if (!Number.isFinite(numValor) || numValor < 0) {
    return { error: 'El campo "valor" debe ser un número mayor o igual a cero' }
  }

  if (typeof moneda !== 'string' || !moneda.trim()) {
    return { error: 'El campo "moneda" es obligatorio (ej. COP, USD)' }
  }

  return {
    value: {
      concepto: concepto.trim(),
      valor: numValor,
      moneda: moneda.trim().toUpperCase(),
      observaciones: typeof observaciones === 'string' ? observaciones.trim() : undefined,
    },
  }
}

module.exports = {
  validateCreateProductoBody,
  validateCreateCostoBody,
}
