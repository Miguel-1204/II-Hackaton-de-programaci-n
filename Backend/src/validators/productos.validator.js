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
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'El cuerpo de la solicitud debe ser un objeto JSON válido' }
  }

  const { codigo, nombre, descripcion, precioReferencia, unidadComercial } = body

  if (typeof codigo !== 'string' || !codigo.trim()) {
    return { error: 'El campo "codigo" es obligatorio y debe ser una cadena no vacía' }
  }

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return { error: 'El campo "nombre" es obligatorio y debe ser una cadena no vacía' }
  }
  if (codigo.trim().length > 100 || nombre.trim().length > 200) {
    return { error: 'codigo admite hasta 100 caracteres y nombre hasta 200' }
  }
  if (descripcion !== undefined && descripcion !== null && (
    typeof descripcion !== 'string' || descripcion.length > 4000
  )) {
    return { error: 'descripcion debe ser texto de hasta 4000 caracteres' }
  }

  let sanitizedPrecio = undefined
  if (precioReferencia !== undefined && precioReferencia !== null) {
    const num = Number(precioReferencia)
    if (
      !Number.isFinite(num) ||
      num < 0 ||
      num > 999999999999.99 ||
      Math.round(num * 100) / 100 !== num
    ) {
      return { error: 'precioReferencia debe ser no negativo, tener hasta 2 decimales y ajustarse al rango permitido' }
    }
    if (unidadComercial !== undefined && unidadComercial !== null && (
      typeof unidadComercial !== 'string' || unidadComercial.trim().length > 50
    )) {
      return { error: 'unidadComercial debe ser texto de hasta 50 caracteres' }
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
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'El cuerpo de la solicitud debe ser un objeto JSON válido' }
  }

  const { concepto, valor, moneda, observaciones } = body

  if (typeof concepto !== 'string' || !concepto.trim()) {
    return { error: 'El campo "concepto" es obligatorio' }
  }

  const numValor = Number(valor)
  if (
    !Number.isFinite(numValor) ||
    numValor < 0 ||
    numValor > 999999999999.99 ||
    Math.round(numValor * 100) / 100 !== numValor
  ) {
    return { error: 'valor debe ser no negativo, tener hasta 2 decimales y ajustarse al rango permitido' }
  }

  if (typeof moneda !== 'string' || !moneda.trim()) {
    return { error: 'El campo "moneda" es obligatorio (ej. COP, USD)' }
  }
  if (concepto.trim().length > 150 || moneda.trim().length > 10) {
    return { error: 'concepto admite hasta 150 caracteres y moneda hasta 10' }
  }
  if (observaciones !== undefined && observaciones !== null && (
    typeof observaciones !== 'string' || observaciones.length > 4000
  )) {
    return { error: 'observaciones debe ser texto de hasta 4000 caracteres' }
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
