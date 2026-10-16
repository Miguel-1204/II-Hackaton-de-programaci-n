import { api, queryString } from './api'

export async function obtenerLotesDisponibles() {
  const result = await api(`/inventario/lotes${queryString({ page: 1, limit: 100 })}`)
  return result.items.map((item) => ({
    id: item.id,
    codigo: item.codigo,
    disponible: Number(item.cantidadDisponibleKg || 0),
    estado: item.estado,
  }))
}

export async function sugerirCodigoTransformacion() {
  const { items = [] } = await api('/transformaciones?limit=100')
  const max = items.reduce((value, item) => Math.max(value, Number(/^TRF(\d+)$/i.exec(item.codigo)?.[1] || 0)), 0)
  return `TRF${String(max + 1).padStart(3, '0')}`
}

export async function crearTransformacion(datos) {
  const result = await api('/transformaciones', {
    method: 'POST',
    body: JSON.stringify({
      codigo: datos.codigo,
      etapa: datos.etapa,
      observaciones: datos.observaciones,
      claveIdempotencia: datos.clave_idempotencia,
      estado: 'COMPLETADA',
      lotesEntrada: datos.entradas.map(({ lote_id, cantidad, unidad }) => ({ loteId: lote_id, cantidad, unidad })),
      lotesSalida: datos.salidas.map(({ lote_id, cantidad, unidad }) => ({
        ...(lote_id ? { loteId: lote_id } : {}),
        cantidad,
        unidad,
      })),
    }),
  })
  const transformacionId = result.transformacion?.id
  if (transformacionId && !result.idempotente) {
    for (const incidencia of datos.incidencias || []) {
      await api('/incidencias', {
        method: 'POST',
        body: JSON.stringify({
          loteId: incidencia.lote_id,
          transformacionId,
          tipo: incidencia.tipo,
          severidad: incidencia.severidad,
          descripcion: incidencia.descripcion,
        }),
      })
    }
  }
  return {
    codigo: result.transformacion?.codigo || datos.codigo,
    merma_pct: result.merma?.mermaPorcentaje ?? result.merma?.merma_pct ?? 0,
    supera_umbral: result.merma?.superaUmbral ?? result.merma?.supera_umbral ?? false,
    lotes_creados: result.lotesSalidaCreados || [],
  }
}
