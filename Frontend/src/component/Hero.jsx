import { useToast } from '../context/ToastContext'

/**
 * Hero Section (carrusel de imágenes placeholder).
 */
export default function Hero() {
  const { showMessage } = useToast()

  return (
    <section className="relative w-full h-[50vh] md:h-[60vh] bg-cacao-700 overflow-hidden flex items-center justify-center group">
      {/* Imagen del Banner (Placeholder) */}
      <img
        src="https://placehold.co/1200x600/eb5e00/fffbbd?text=Banner+Principal+Cacao"
        alt="Banner Principal"
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />

      {/* Flecha Izquierda */}
      <button
        type="button"
        onClick={() => showMessage('Moviendo carrusel a la izquierda')}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/50 hover:bg-white text-cacao-800 p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10 focus:outline-none"
        aria-label="Carrusel anterior"
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

      {/* Flecha Derecha */}
      <button
        type="button"
        onClick={() => showMessage('Moviendo carrusel a la derecha')}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/50 hover:bg-white text-cacao-800 p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10 focus:outline-none"
        aria-label="Carrusel siguiente"
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
    </section>
  )
}