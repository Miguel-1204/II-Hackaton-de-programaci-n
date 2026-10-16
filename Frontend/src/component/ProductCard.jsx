import { useToast } from '../context/ToastContext'
import { formatPrice } from '../data/products'

/**
 * Tarjeta de producto reutilizable.
 * @param {{ id: number, name: string, price: number, image: string, alt: string }} product
 */
export default function ProductCard({ product }) {
  const { showMessage } = useToast()

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-mazorca-400/40 hover:shadow-xl transition-shadow duration-300 flex flex-col group">
      <div className="relative h-64 overflow-hidden">
        <img
          src={product.image}
          alt={product.alt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="p-6 flex flex-col flex-grow text-center">
        <h3 className="text-xl font-bold text-cacao-700 mb-2 font-display">{product.name}</h3>
        <p className="text-cacao-900 font-semibold text-2xl mt-auto">{formatPrice(product.price)}</p>
        <button
          type="button"
          onClick={() => showMessage(`Añadido ${product.name} al carrito`)}
          className="mt-4 w-full bg-cacao-700 hover:bg-cacao-700 text-white font-bold py-2 px-4 rounded-xl transition-colors"
        >
          Comprar
        </button>
      </div>
    </div>
  )
}