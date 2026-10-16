import { api, queryString } from './api'

export async function obtenerVentas(filters = {}) {
  return api(`/ventas${queryString(filters)}`)
}

export async function registrarVenta(venta) {
  const claveIdempotencia = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return api('/ventas', {
    method: 'POST',
    headers: { 'Idempotency-Key': claveIdempotencia },
    body: JSON.stringify(venta),
  })
}
