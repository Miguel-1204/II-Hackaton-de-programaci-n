import { api, clearToken, getToken, setToken } from './api'

const rol = (roles = []) => {
  const normalizados = roles.map((item) => item.toLowerCase())
  return normalizados.includes('administrador') ? 'administrador' : normalizados[0]
}

function perfilUsuario(user) {
  return { ...user, rol: rol(user.roles) }
}

export async function obtenerPerfil() {
  const { user } = await api('/auth/me')
  return perfilUsuario(user)
}

export async function iniciarSesion(username, password) {
  const entrada = username.trim().toLowerCase()
  const dominio = import.meta.env.VITE_AUTH_DOMAIN || 'cacao.local'
  const email = entrada.includes('@') ? entrada : `${entrada}@${dominio}`
  const result = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(result.token)
  return perfilUsuario(result.user)
}

export async function cerrarSesion() {
  clearToken()
}

export const haySesion = () => Boolean(getToken())
