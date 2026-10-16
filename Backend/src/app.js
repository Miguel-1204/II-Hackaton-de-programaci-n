const cors = require('cors')
const express = require('express')
const { createAuthController } = require('./controllers/auth.controller')
const { createAuthModel } = require('./models/auth.model')
const { createAuthRouter } = require('./routes/auth.routes')
const { createAuthService } = require('./services/auth.service')
const { createAuthenticationMiddleware } = require('./middlewares/auth.middleware')

function createApp({ db, authModel, authService, jwtSecret, tokenExpiresIn } = {}) {
  const app = express()
  const model = authModel || createAuthModel(db)
  const service =
    authService ||
    createAuthService({
      authModel: model,
      jwtSecret,
      tokenExpiresIn,
    })
  const controller = createAuthController(service)
  const authenticate = createAuthenticationMiddleware(service)

  app.use(cors())
  app.use(express.json({ limit: '16kb' }))

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' })
  })

  app.use('/api/auth', createAuthRouter({ controller, authenticate }))

  app.use((error, _request, response, _next) => {
    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({ error: 'JSON inválido' })
    }

    if (error.type === 'entity.too.large') {
      return response.status(413).json({ error: 'Solicitud demasiado grande' })
    }

    if (error.name === 'AuthConfigurationError') {
      return response.status(503).json({ error: 'Autenticación no configurada' })
    }

    console.error('Error interno del servidor')
    return response.status(500).json({ error: 'Error interno del servidor' })
  })

  return app
}

module.exports = { createApp }