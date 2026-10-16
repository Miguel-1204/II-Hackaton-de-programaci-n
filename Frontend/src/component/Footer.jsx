/**
 * Pie de página.
 */
export default function Footer() {
  return (
    <footer className="bg-cacao-800 text-white py-10 border-t-4 border-cacao-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h4 className="text-2xl font-bold text-cacao-50 mb-2 font-display">Cacao del Huila</h4>
          <p className="text-sm opacity-80">El mejor sabor del sur de Colombia.</p>
        </div>

        <div className="text-center">
          <p className="text-sm opacity-80">
            &copy; 2026 Cacao del Huila. Todos los derechos reservados.
          </p>
        </div>

        {/* Redes sociales o enlaces adicionales */}
        <div className="flex space-x-4">
          <a href="#" className="text-white hover:text-cacao-100 transition-colors">
            Facebook
          </a>
          <a href="#" className="text-white hover:text-cacao-100 transition-colors">
            Instagram
          </a>
        </div>
      </div>
    </footer>
  )
}