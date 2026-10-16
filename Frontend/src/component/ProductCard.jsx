import imagenFondo from '../assets/Chocolate default.jpeg'

/**
 * Tarjeta de producto reutilizable.
 * @param {{ id: number, name: string, image: string, alt: string, stockDisponibleKg?: number, disponible?: boolean }} product
 */
export default function ProductCard({ product }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-mazorca-400/40 hover:shadow-xl transition-shadow duration-300 flex flex-col group">
      <div className="relative h-64 overflow-hidden">
        <img
          src={product.image || imagenFondo}
          alt={product.alt}
          onError={(event) => { event.currentTarget.src = imagenFondo }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="p-6 flex flex-col flex-grow text-center">
        <h3 className="text-xl font-bold text-cacao-700 mb-2 font-display mt-auto">{product.name}</h3>
        {product.stockDisponibleKg !== undefined && <p className={`mt-2 text-sm font-medium ${product.disponible ? 'text-emerald-700' : 'text-cacao-500'}`}>
          {product.disponible ? `Disponible: ${Number(product.stockDisponibleKg).toLocaleString('es-CO')} kg` : 'Sin stock disponible'}
        </p>}
      </div>
    </div>
  )
}
