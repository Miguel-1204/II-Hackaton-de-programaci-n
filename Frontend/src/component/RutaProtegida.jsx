import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const rutaPorRol = (rol) => (rol === 'administrador' ? '/admin' : '/operador')

export default function RutaProtegida({ roles }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()

  if (cargando) {
    return (
      <p role="status" className="p-6 text-cacao-700">
        Verificando sesión…
      </p>
    )
  }

  // Sin sesión: al login, recordando a dónde quería ir
  if (!usuario) return <Navigate to="/login" state={{ from: location }} replace />

  // Con sesión pero sin el rol requerido: a su propio panel
  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to={rutaPorRol(usuario.rol)} replace />
  }

  return <Outlet />
}