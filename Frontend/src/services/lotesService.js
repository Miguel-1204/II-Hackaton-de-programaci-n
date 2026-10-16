import { api, queryString } from './api'

export const MUNICIPIOS_HUILA = ['Rivera', 'Campoalegre', 'Algeciras', 'Gigante', 'Garzón', 'San Agustín', 'Pitalito', 'Palermo', 'Aipe', 'Tarqui', 'Tesalia', 'La Plata']
// Compatibilidad para vistas que aún no consumen un catálogo remoto.
export const LOTES_INICIALES = []
export const persistirLotesDemo = () => {}

export async function obtenerLotes() {
  const result = await api(`/inventario/lotes${queryString({ page: 1, limit: 100 })}`)
  const items = [...result.items]
  for (let page = 2; items.length < result.total; page += 1) {
    const next = await api(`/inventario/lotes${queryString({ page, limit: 100 })}`)
    if (!next.items.length) break
    items.push(...next.items)
  }
  return items.map((item) => ({
    id: item.id,
    codigo: item.codigo,
    tipo_material: item.tipoMaterial,
    productor: item.productor,
    fecha_recepcion: item.fechaRecepcion,
    cantidad_recibida: item.cantidadRecibida,
    unidad: item.unidad,
    creado_por_transformacion: item.creadoPorTransformacion,
    cantidad_consumida: item.cantidadSalidaKg,
    cantidad_disponible: item.cantidadDisponibleKg,
    estado: item.estado,
    historial_estados: [],
  }))
}

export async function obtenerCatalogosLote() {
  const [productores, productos] = await Promise.all([
    api(`/productores${queryString({ page: 1, limit: 100 })}`),
    api('/productos'),
  ])
  return {
    productores: productores.items,
    productos: productos.productos,
  }
}

export async function sugerirCodigoLote() {
  const lotes = await obtenerLotes()
  const max = lotes.reduce((value, lote) => Math.max(value, Number(/^CAC(\d+)$/i.exec(lote.codigo)?.[1] || 0)), 0)
  return `CAC${String(max + 1).padStart(3, '0')}`
}

export async function crearLote(datos) {
  const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  const { lote } = await api('/recepciones', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      codigo: datos.codigo,
      productorId: datos.productor_id,
      productoId: datos.producto_id,
      fechaRecepcion: datos.fecha_recepcion,
      cantidad: datos.cantidad,
      unidad: datos.unidad,
      tipoMaterial: datos.tipo_material,
    }),
  })
  return lote
}

export async function cambiarEstadoLote(id, estadoNuevo, motivo) {
  return api(`/lotes/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estadoNuevo: estadoNuevo.toUpperCase(), motivo }),
  })
}
