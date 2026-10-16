function validateCreateVentaBody(body, claveIdempotencia) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'El cuerpo de la solicitud debe ser un objeto JSON válido' }
  }

  const loteId = Number(body.loteId)
  const cantidadKg = Number(body.cantidadKg)
  const precioUnitarioCop = Number(body.precioUnitarioCop)
  const cliente = typeof body.cliente === 'string' ? body.cliente.trim() : ''

  if (!Number.isSafeInteger(loteId) || loteId <= 0) {
    return { error: 'loteId debe ser un identificador entero positivo' }
  }
  if (!Number.isFinite(cantidadKg) || cantidadKg <= 0 || cantidadKg > 99999999999.999 ||
    Math.round(cantidadKg * 1000) / 1000 !== cantidadKg) {
    return { error: 'cantidadKg debe ser positiva y tener hasta 3 decimales' }
  }
  if (!Number.isFinite(precioUnitarioCop) || precioUnitarioCop < 0 ||
    precioUnitarioCop > 999999999999.99 ||
    Math.round(precioUnitarioCop * 100) / 100 !== precioUnitarioCop) {
    return { error: 'precioUnitarioCop debe ser no negativo y tener hasta 2 decimales' }
  }
  if (!Number.isFinite(cantidadKg * precioUnitarioCop) ||
    cantidadKg * precioUnitarioCop > 99999999999999.99) {
    return { error: 'El valor total de la venta excede el límite permitido' }
  }
  if (cliente.length > 200) {
    return { error: 'cliente debe tener hasta 200 caracteres' }
  }
  if (typeof claveIdempotencia !== 'string' || !claveIdempotencia.trim() || claveIdempotencia.trim().length > 180) {
    return { error: 'Se requiere Idempotency-Key de hasta 180 caracteres' }
  }

  return {
    value: {
      loteId,
      cantidadKg,
      precioUnitarioCop,
      cliente: cliente || undefined,
      claveIdempotencia: claveIdempotencia.trim(),
    },
  }
}

module.exports = { validateCreateVentaBody }
