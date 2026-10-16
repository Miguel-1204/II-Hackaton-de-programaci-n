import { api } from './api'

export async function obtenerCostosPersistidos() {
  const { costos = [] } = await api('/estadisticas/costos')
  return costos
}
