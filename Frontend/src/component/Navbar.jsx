import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import logo from '../assets/logos/Logo.svg'

/**
 * Header / Menú de navegación principal.
 */
export default function Navbar() {
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const irALogin = () => navigate('/login')

  return (
    <header className="bg-cacao-50 shadow-sm sticky top-0 z-50">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-16 sm:h-20 gap-3">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="block" aria-label="Inicio Cacao del Huila">
              <div className="w-16 h-16 rounded-full border-2 border-cacao-200 flex items-center justify-center bg-cacao-100 shadow-md overflow-hidden">
                <img
                  src={logo}
                  alt="Logo Cacao del Huila"
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>
          </div>

          {/* Enlaces de navegación (Centro) */}
          <nav aria-label="Navegación principal" className="hidden md:flex space-x-12">
            <Link to="/nosotros" className="text-lg font-semibold text-cacao-700 hover:text-cacao-900 transition-colors">
              Nosotros
            </Link>
            <Link
              to="/nuestros-cacaos"
              className="text-lg font-semibold text-cacao-700 hover:text-cacao-900 transition-colors"
            >
              Nuestros Cacaos
            </Link>
          </nav>

          {/* Icono de Usuario / Login (Derecha) */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
              className="md:hidden mr-2 p-2 rounded-lg text-cacao-800 hover:bg-cacao-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mazorca-500"
              aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuAbierto}
              aria-controls="menu-movil"
            >
              {menuAbierto ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
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
        {menuAbierto && (
          <nav id="menu-movil" aria-label="Navegación móvil" className="md:hidden absolute left-0 right-0 top-full z-50 border-t border-cacao-200 bg-cacao-50 px-4 py-3 shadow-lg">
            <Link onClick={() => setMenuAbierto(false)} to="/nosotros" className="block rounded-lg px-3 py-3 text-base font-semibold text-cacao-800 hover:bg-cacao-100">Nosotros</Link>
            <Link onClick={() => setMenuAbierto(false)} to="/nuestros-cacaos" className="block rounded-lg px-3 py-3 text-base font-semibold text-cacao-800 hover:bg-cacao-100">Nuestros Cacaos</Link>
          </nav>
        )}
      </div>
    </header>
  )
}
