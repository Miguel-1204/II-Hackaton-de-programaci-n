import ProductCard from './ProductCard'
import { products } from '../data/products'
import { useToast } from '../context/ToastContext'

/**
 * Sección "Productos más vendidos" con grid de tarjetas y controles de slider.
 */
export default function ProductsSection() {
  const { showMessage } = useToast()

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-cacao-900 font-display">
        Productos Más vendidos
      </h2>

      <div className="relative flex items-center">
        {/* Flecha Izquierda Slider Productos */}
        <button
          type="button"
          onClick={() => showMessage('Ver productos anteriores')}
          className="absolute -left-4 md:-left-12 bg-white border border-cacao-500 text-cacao-700 hover:bg-cacao-700 hover:text-white p-2 rounded-full shadow-md transition-colors z-10 focus:outline-none hidden sm:block"
          aria-label="Ver productos anteriores"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Contenedor de Tarjetas (Grid) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Flecha Derecha Slider Productos */}
        <button
          type="button"
          onClick={() => showMessage('Ver más productos')}
          className="absolute -right-4 md:-right-12 bg-white border border-cacao-500 text-cacao-700 hover:bg-cacao-700 hover:text-white p-2 rounded-full shadow-md transition-colors z-10 focus:outline-none hidden sm:block"
          aria-label="Ver más productos"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Enlace Ver más */}
      <div className="mt-8 flex justify-end">
        <a
          href="#"
          className="text-lg font-bold text-cacao-700 hover:text-cacao-900 flex items-center group"
        >
          Ver más...
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-5 h-5 ml-1 transform group-hover:translate-x-1 transition-transform"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
            />
          </svg>
        </a>
      </div>
    </section>
  )
}