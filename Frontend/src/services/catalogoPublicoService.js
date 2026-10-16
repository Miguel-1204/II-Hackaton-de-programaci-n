import { api } from './api'

export async function obtenerCatalogoPublico() {
  const { productos = [] } = await api('/public/productos')
  return productos.map((ficha) => ({
    ...ficha.producto,
    name: ficha.producto.nombre,
    imagenUrl: ficha.producto.imagenUrl,
    price: ficha.producto.precioReferencia,
    origen: ficha.origenes.length ? ficha.origenes.join(', ') : 'Origen sin registrar',
    presentacion: ficha.producto.unidadComercial || 'No especificada',
    estado: ficha.estadoComercial,
    stockDisponibleKg: ficha.stockDisponibleKg,
    disponible: ficha.disponible,
  }))
}

export function obtenerFichaTecnicaPublica(codigo) {
  return api(`/public/productos/${encodeURIComponent(codigo)}`)
}
