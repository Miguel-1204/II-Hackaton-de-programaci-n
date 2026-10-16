const {
  AuthenticationError,
} = require('../services/auth.service')

function createAuthenticationMiddleware(authService) {
  return async function authenticate(request, response, next) {
    const authorization = request.get('authorization')
    const match =
      typeof authorization === 'string' &&
      /^Bearer\s+([^\s]+)$/i.exec(authorization)

    if (!match) {
      return response.status(401).json({ error: 'Autenticación requerida' })
    }

    try {
      request.user = await authService.authenticateToken(match[1])
      return next()
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return response.status(401).json({ error: 'Token inválido o expirado' })
      }
      return next(error)
    }
  }
}

function requireRoles(...allowedRoles) {
  if (allowedRoles.length === 0 || allowedRoles.some((role) => !role)) {
    throw new Error('requireRoles necesita al menos un rol válido')
  }

  return function authorize(request, response, next) {
    if (!request.user) {
      return response.status(401).json({ error: 'Autenticación requerida' })
    }

    if (!allowedRoles.some((role) => request.user.roles.includes(role))) {
      return response.status(403).json({ error: 'Permisos insuficientes' })
    }

    return next()
  }
}

module.exports = { createAuthenticationMiddleware, requireRoles }
