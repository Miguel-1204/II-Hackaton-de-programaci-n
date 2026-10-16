import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Consultas from '../Consultas/Consultas'
import {
  IconChart, IconAlert, IconMoney, IconPackage, IconClipboard,
  IconLogout, IconRobot, IconMenu, IconX, IconCacao
} from '../../component/Icons'

const MENU_ADMIN = [
  { to: '/admin', texto: 'Inicio', Icon: IconChart, end: true },
  { to: '/admin/alertas', texto: 'Alertas', Icon: IconAlert },
  { to: '/admin/economia', texto: 'Economía y Costos', Icon: IconMoney },
  { to: '/admin/productos', texto: 'Lotes y Trazabilidad', Icon: IconPackage },
  { to: '/admin/auditoria', texto: 'Auditoría', Icon: IconClipboard },
]

export default function DashboardAdministrador() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [modalConsultasAbierto, setModalConsultasAbierto] = useState(false)

  // Escuchar si alguna vista solicita abrir el modal NLP
  useEffect(() => {
    const handleAbrir = () => setModalConsultasAbierto(true)
    window.addEventListener('abrir-consultas-nlp', handleAbrir)
    return () => window.removeEventListener('abrir-consultas-nlp', handleAbrir)
  }, [])

  const handleCerrarSesion = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-[#FDF8F5] text-cacao-950 font-sans relative">
      {/* Franja superior móvil */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#2C1A14] text-white flex items-center justify-between px-4 py-3 shadow-md">
        <div className="flex items-center gap-2">
          <IconCacao className="w-6 h-6 text-mazorca-400" />
          <span className="font-display font-bold text-base text-cacao-50">Cacao del Huila</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="p-2 rounded-lg bg-cacao-800 text-cacao-100 hover:text-white cursor-pointer"
          aria-label="Abrir menú de navegación"
        >
          {menuAbierto ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
        </button>
      </div>

      {/* Overlay oscuro en móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Lateral */}
      <aside
        className={`fixed md:sticky top-0 bottom-0 left-0 z-40 w-64 bg-[#2C1A14] text-cacao-50 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } shadow-xl border-r border-[#3D251D]`}
      >
        <div>
          {/* Logo y Encabezado */}
          <div className="px-6 py-6 border-b border-[#3D251D] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mazorca-500/20 border border-mazorca-500/40 flex items-center justify-center shadow-inner text-mazorca-400">
              <IconCacao className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-white leading-tight">
                Cacao del Huila
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider text-mazorca-400 block mt-0.5">
                Panel de Administrador
              </span>
            </div>
          </div>

          {/* Menú de Navegación (Sin Consultas NLP según solicitado) */}
          <nav aria-label="Navegación Administrador" className="p-4 space-y-1.5">
            {MENU_ADMIN.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition ${
                    isActive
                      ? 'bg-[#4A2A18] text-white border-l-4 border-mazorca-500 shadow-sm'
                      : 'text-cacao-200 hover:bg-[#382119] hover:text-white'
                  }`
                }
              >
                <item.Icon className="w-4 h-4 shrink-0" />
                <span>{item.texto}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Perfil de Usuario y Logout */}
        <div className="p-4 border-t border-[#3D251D] bg-[#241510]">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-9 h-9 rounded-full bg-mazorca-500/30 text-mazorca-400 border border-mazorca-500/40 flex items-center justify-center font-bold text-sm">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {usuario?.nombre || 'Administrador Demo'}
              </p>
              <p className="text-[11px] text-cacao-300 capitalize truncate">
                {usuario?.rol || 'Administrador'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCerrarSesion}
            className="w-full mt-3 px-3 py-2 text-xs font-semibold text-cacao-200 hover:text-white bg-[#382119] hover:bg-peligro-600/30 border border-cacao-700/60 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <IconLogout className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 min-w-0 pt-16 md:pt-0 overflow-y-auto">
        <Outlet />
      </main>

      {/* BOTÓN SIEMPRE VISIBLE EN LA PARTE LATERAL DERECHA */}
      <button
        type="button"
        onClick={() => setModalConsultasAbierto(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#2C1A14] hover:bg-cacao-800 text-mazorca-400 hover:text-white border-l-2 border-y-2 border-mazorca-500/80 rounded-l-2xl py-3.5 px-2.5 shadow-2xl flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 hover:-translate-x-1 group"
        title="Abrir motor de Consultas Inteligentes NLP"
        aria-label="Abrir consultas inteligentes en lenguaje natural"
      >
        <IconRobot className="w-5 h-5 group-hover:scale-125 transition-transform" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-cacao-100 [writing-mode:vertical-rl] rotate-180">
          Consultas NLP
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>

      {/* MODAL DE CONSULTAS NLP */}
      <Consultas
        abierto={modalConsultasAbierto}
        alCerrar={() => setModalConsultasAbierto(false)}
      />
    </div>
  )
}
