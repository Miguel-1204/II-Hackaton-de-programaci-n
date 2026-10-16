const jwt = require('jsonwebtoken')
const { hashPassword, verifyPassword } = require('../utils/password')

const TOKEN_ISSUER = 'hackaton-backend'
const MAX_TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60
const DURATION_UNITS = { s: 1, m: 60, h: 3600, d: 86400 }

class AuthenticationError extends Error {
  constructor(message = 'Token inválido o expirado') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

class AuthConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthConfigurationError'
  }
}

function parseTokenLifetime(value) {
  if (value === undefined || value === '') {
    return 900
  }

  const match = /^([1-9]\d*)(s|m|h|d)$/.exec(value)
  if (!match) {
    throw new AuthConfigurationError(
      'JWT_EXPIRES_IN debe usar segundos, minutos, horas o días',
    )
  }

  const seconds = Number(match[1]) * DURATION_UNITS[match[2]]
  if (!Number.isSafeInteger(seconds) || seconds > MAX_TOKEN_LIFETIME_SECONDS) {
    throw new AuthConfigurationError('JWT_EXPIRES_IN excede el máximo permitido')
  }
  return seconds
}

function publicUser(user) {
  return {
    id: user.id,
    nombre: user.nombre,
    correo: user.correo,
    roles: user.roles,
  }
}

function createAuthService({
  authModel,
  jwtSecret = process.env.JWT_SECRET,
  tokenExpiresIn = process.env.JWT_EXPIRES_IN,
}) {
  if (!authModel) {
    throw new Error('El modelo de autenticación es obligatorio')
  }

  const expiresInSeconds = parseTokenLifetime(tokenExpiresIn)

  function getSecret() {
    if (typeof jwtSecret !== 'string' || Buffer.byteLength(jwtSecret) < 32) {
      throw new AuthConfigurationError(
        'JWT_SECRET debe tener al menos 32 bytes',
      )
    }
    return jwtSecret
  }

  async function login(email, password) {
    const user = await authModel.findByEmail(email)
    if (!user) {
      await hashPassword(password)
      return null
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash)
    if (!passwordMatches || !user.activo) {
      return null
    }

    const token = jwt.sign(
      {},
      getSecret(),
      {
        algorithm: 'HS256',
        subject: String(user.id),
        issuer: TOKEN_ISSUER,
        expiresIn: expiresInSeconds,
      },
    )

    return {
      token,
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
      user: publicUser(user),
    }
  }

  async function authenticateToken(token) {
    let claims
    try {
      claims = jwt.verify(token, getSecret(), {
        algorithms: ['HS256'],
        issuer: TOKEN_ISSUER,
      })
    } catch (error) {
      if (error.name === 'AuthConfigurationError') {
        throw error
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError()
      }
      throw error
    }

    const id = Number(claims.sub)
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new AuthenticationError()
    }

    const user = await authModel.findById(id)
    if (!user || !user.activo) {
      throw new AuthenticationError()
    }

    return publicUser(user)
  }

  return { authenticateToken, login }
}

module.exports = {
  AuthConfigurationError,
  AuthenticationError,
  createAuthService,
}
