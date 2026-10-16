import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from './ProductCard'
import { obtenerCatalogoPublico } from '../services/catalogoPublicoService'

export default function ProductsSection() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const carruselRef = useRef(null)

  useEffect(() => {
    let activo = true
    obtenerCatalogoPublico()
      .then((items) => {
        if (activo) {
          setProductos(items)
          setError('')
        }
      })
      .catch((err) => {
        if (activo) setError(err.message || 'No se pudo cargar el inventario de productos.')
      })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  const productosConMasStock = useMemo(() => [...productos]
    .sort((a, b) => Number(b.stockDisponibleKg || 0) - Number(a.stockDisponibleKg || 0))
    .slice(0, 6), [productos])

  const desplazar = (direccion) => {
    if (!carruselRef.current) return
    carruselRef.current.scrollBy({ left: direccion * carruselRef.current.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" aria-labelledby="productos-destacados-titulo">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-mazorca-700">Desde nuestro inventario</p>
          <h2 id="productos-destacados-titulo" className="text-3xl md:text-4xl font-bold text-cacao-900 font-display mt-1">Productos con más stock</h2>
        </div>
        <p className="text-sm text-cacao-600">Selección ordenada por disponibilidad actual</p>
      </div>

      <div className="relative">
        <button type="button" onClick={() => desplazar(-1)} className="absolute -left-3 md:-left-5 top-1/2 -translate-y-1/2 bg-white border border-cacao-300 text-cacao-700 hover:bg-cacao-700 hover:text-white p-2 rounded-full shadow-md transition-colors z-10 hidden sm:block" aria-label="Ver productos anteriores">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>

        {cargando ? (
          <div className="py-16 text-center text-cacao-600" role="status">Cargando productos e inventario…</div>
        ) : error ? (
          <div className="py-12 text-center text-red-800 bg-red-50 border border-red-200 rounded-2xl" role="alert">{error}</div>
        ) : productosConMasStock.length ? (
          <div ref={carruselRef} className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 [scrollbar-width:thin]">
            {productosConMasStock.map((product) => (
              <div key={product.id} className="min-w-[85%] sm:min-w-[calc(50%_-_0.75rem)] lg:min-w-[calc(33.333%_-_1rem)] snap-start">
                <ProductCard product={{
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image: product.imagenUrl,
                  alt: product.descripcion || product.name,
                  stockDisponibleKg: product.stockDisponibleKg,
                  disponible: product.disponible,
                }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-cacao-600 bg-white rounded-2xl border border-cacao-200">No hay productos registrados en el catálogo.</div>
        )}

        <button type="button" onClick={() => desplazar(1)} className="absolute -right-3 md:-right-5 top-1/2 -translate-y-1/2 bg-white border border-cacao-300 text-cacao-700 hover:bg-cacao-700 hover:text-white p-2 rounded-full shadow-md transition-colors z-10 hidden sm:block" aria-label="Ver más productos">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>

      <div className="mt-6 flex justify-end">
        <Link to="/nuestros-cacaos" className="text-lg font-bold text-cacao-700 hover:text-cacao-900 flex items-center group">
          Ver más...
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5 ml-1 transform group-hover:translate-x-1 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" /></svg>
        </Link>
      </div>
    </section>
  )
}
