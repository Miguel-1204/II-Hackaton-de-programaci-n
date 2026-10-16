const { cantidadAKg } = require('../utils/conversion')

const UNIT_ALIASES = new Map([
  ['kg', 'kg'],
  ['kilogramo', 'kg'],
  ['kilogramos', 'kg'],
  ['g', 'g'],
  ['gramo', 'g'],
  ['gramos', 'g'],
  ['t', 't'],
  ['ton', 't'],
  ['tonelada', 't'],
  ['toneladas', 't'],
])

function validateReceptionBody(body, idempotencyKey) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'El cuerpo de la solicitud debe ser un objeto' }
  }
  if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.length > 150) {
    return { error: 'El encabezado Idempotency-Key es obligatorio y no debe superar 150 caracteres' }
  }

  const productorId = Number(body.productorId)
  if (!Number.isSafeInteger(productorId) || productorId <= 0) {
    return { error: 'productorId debe ser un entero positivo' }
  }
  if (typeof body.codigo !== 'string' || !body.codigo.trim() || body.codigo.trim().length > 100) {
    return { error: 'codigo es obligatorio y debe tener hasta 100 caracteres' }
  }

  const cantidad = Number(body.cantidad)
  if (
    !Number.isFinite(cantidad) ||
    cantidad <= 0 ||
    cantidad > 99999999999.999 ||
    Math.round(cantidad * 1000) / 1000 !== cantidad
  ) {
    return { error: 'cantidad debe ser positiva, tener hasta 3 decimales y ajustarse al rango permitido' }
  }
  if (typeof body.unidad !== 'string') {
    return { error: 'unidad debe ser una unidad de masa comparable (kg, g o t)' }
  }
  const unidad = UNIT_ALIASES.get(body.unidad.trim().toLowerCase())
  if (!unidad || cantidadAKg(cantidad, unidad) === null) {
    return { error: 'unidad debe ser una unidad de masa comparable (kg, g o t)' }
  }

  let fechaRecepcion
  if (body.fechaRecepcion === undefined) {
    fechaRecepcion = new Date().toISOString().slice(0, 10)
  } else if (
    typeof body.fechaRecepcion !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.fechaRecepcion) ||
    !Number.isFinite(new Date(`${body.fechaRecepcion}T00:00:00.000Z`).getTime()) ||
    new Date(`${body.fechaRecepcion}T00:00:00.000Z`).toISOString().slice(0, 10) !== body.fechaRecepcion
  ) {
    return { error: 'fechaRecepcion debe tener formato YYYY-MM-DD y ser una fecha válida' }
  } else {
    fechaRecepcion = body.fechaRecepcion
  }

  let productoId
  if (body.productoId !== undefined && body.productoId !== null) {
    productoId = Number(body.productoId)
    if (!Number.isSafeInteger(productoId) || productoId <= 0) {
      return { error: 'productoId debe ser un entero positivo' }
    }
  }
  if (body.tipoMaterial !== undefined && (
    typeof body.tipoMaterial !== 'string' ||
    body.tipoMaterial.trim().length > 150
  )) {
    return { error: 'tipoMaterial debe ser texto de hasta 150 caracteres' }
  }

  return {
    value: {
      productorId,
      productoId,
      codigo: body.codigo.trim(),
      cantidad,
      unidad,
      fechaRecepcion,
      tipoMaterial: body.tipoMaterial?.trim() || null,
      claveIdempotencia: `recepcion:${idempotencyKey.trim()}`,
    },
  }
}

module.exports = { validateReceptionBody }
