import { useNavigate } from 'react-router-dom'
import logo from '../assets/logos/Logo.svg'

/**
 * Header / Menú de navegación principal.
 */
export default function Navbar() {
  const navigate = useNavigate()
  const irALogin = () => navigate('/login')

  return (
    <header className="bg-cacao-50 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <a href="/Home" className="block">
              <div className="w-16 h-16 rounded-full border-2 border-cacao-200 flex items-center justify-center bg-cacao-100 shadow-md overflow-hidden">
                <img
                  src={logo}
                  alt="Logo Cacao del Huila"
                  className="w-full h-full object-cover"
                />
              </div>
            </a>
          </div>

          {/* Enlaces de navegación (Centro) */}
          <nav className="hidden md:flex space-x-12">
            <a href="#" className="text-lg font-semibold text-cacao-700 hover:text-cacao-900 transition-colors">
              Nosotros
            </a>
            <a href="#" className="text-lg font-semibold text-cacao-700 hover:text-cacao-900 transition-colors">
              Nuestros Cacaos
            </a>
          </nav>

          {/* Icono de Usuario / Login (Derecha) */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={irALogin}
              className="p-2 rounded-full hover:bg-cacao-200/40 text-cacao-800 transition-colors focus:outline-none"
              aria-label="Iniciar sesión"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}