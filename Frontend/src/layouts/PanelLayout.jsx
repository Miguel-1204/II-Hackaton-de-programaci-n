import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './PanelLayout.css'

const MENU = {
  operador: [
    { to: '/operador', texto: 'Inicio', end: true },
    { to: '/lotes', texto: 'Lotes' },
    { to: '/lotes/nuevo', texto: 'Recibir lote' },
    { to: '/transformaciones/nueva', texto: 'Transformar' },
  ],
  administrador: [
    { to: '/admin', texto: 'Inicio', end: true },
    { to: '/lotes', texto: 'Lotes' },
    { to: '/admin/productos', texto: 'Productos' },
    { to: '/admin/auditoria', texto: 'Auditoría' },
  ],
}

export default function PanelLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [abierto, setAbierto] = useState(false)

  // Cierra el menú al cambiar de página
  useEffect(() => {
    setAbierto(false)
  }, [location.pathname])

  // Cierra el menú con la tecla Esc
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  const salir = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="panel-raiz bg-cacao-50 text-cacao-900 font-sans">
      {/* Franja superior, solo en móvil */}
      <div className="panel-movil">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-expanded={abierto}
          aria-controls="menu-lateral"
          className="panel-boton-menu"
        >
          Menú
        </button>
        <span className="font-display font-semibold text-cacao-50">Cacao del Huila</span>
      </div>

      {/* Fondo oscuro detrás del menú en móvil */}
      {abierto && (
        <div className="panel-fondo" onClick={() => setAbierto(false)} aria-hidden="true" />
      )}

      {/* Barra lateral */}
      <aside id="menu-lateral" className={`panel-lateral ${abierto ? 'abierto' : ''}`}>
        <div className="flex items-center justify-between px-4 py-5">
          <span className="font-display text-lg font-semibold text-cacao-50">Cacao del Huila</span>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="panel-boton-menu panel-cerrar"
            aria-label="Cerrar menú"
          >
            Cerrar
          </button>
        </div>

        <nav aria-label="Panel" className="flex-1 px-2">
          <ul className="space-y-1">
            {(MENU[usuario?.rol] ?? []).map((m) => (
              <li key={m.to}>
                <NavLink
                  to={m.to}
                  end={m.end}
                  className={({ isActive }) => `panel-enlace ${isActive ? 'activo' : ''}`}
                >
                  {m.texto}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="panel-usuario">
          <p className="text-sm text-cacao-50">{usuario?.nombre}</p>
          <p className="text-xs capitalize text-cacao-200">{usuario?.rol}</p>
          <button type="button" onClick={salir} className="panel-salir">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}