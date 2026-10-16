import { obtenerLotes } from './lotesService'
import { api } from './api'

export async function obtenerConteoAlertasCriticas() {
  const result = await api('/incidencias/resumen/criticas')
  return Number(result.total || 0)
}

export async function obtenerResumenOperador() {
  const [inventario, transformaciones] = await Promise.all([
    obtenerLotes(),
    api('/transformaciones?limit=100'),
  ])
  const mermas = (transformaciones.items || []).map((item) => ({
    id: item.id,
    codigo: item.codigo,
    etapa: item.etapa,
    fecha: item.fechaProcesamiento,
    merma_pct: item.analiticaMerma?.mermaPorcentaje ?? item.analiticaMerma?.merma_porcentaje,
    alerta: Boolean(item.analiticaMerma?.superaUmbral ?? item.analiticaMerma?.supera_umbral),
  }))
  return { inventario, mermas }
}
