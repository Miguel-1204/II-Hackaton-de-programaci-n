/**
 * @fileoverview Configuración principal de la aplicación Express para Kaotrace.
 * Conecta de forma modular los modelos, servicios, controladores y enrutadores
 * de autenticación, transformaciones, mermas, trazabilidad, costos, estadísticas,
 * reportes PDF e intérprete de lenguaje natural (NLP).
 */

const cors = require('cors')
const express = require('express')

// Autenticación
const { createAuthController } = require('./controllers/auth.controller')
const { createAuthModel } = require('./models/auth.model')
const { createAuthRouter } = require('./routes/auth.routes')
const { createAuthService } = require('./services/auth.service')
const { createAuthenticationMiddleware } = require('./middlewares/auth.middleware')

// Modelos Kaotrace
const { createLotesModel } = require('./models/lotes.model')
const { createTransformacionesModel } = require('./models/transformaciones.model')
const { createProductosModel } = require('./models/productos.model')
const { createTrazabilidadModel } = require('./models/trazabilidad.model')
const { createIncidenciasEstadosModel } = require('./models/incidencias-estados.model')
const { createEstadisticasModel } = require('./models/estadisticas.model')

// Servicios Kaotrace
const { createTransformacionesService } = require('./services/transformaciones.service')
const { createProductosService } = require('./services/productos.service')
const { createTrazabilidadService } = require('./services/trazabilidad.service')
const { createIncidenciasEstadosService } = require('./services/incidencias-estados.service')
const { createEstadisticasService } = require('./services/estadisticas.service')
const { createReportesService } = require('./services/reportes.service')
const { createNlpService } = require('./services/nlp.service')

// Controladores Kaotrace
const { createTransformacionesController } = require('./controllers/transformaciones.controller')
const { createCostosProductosController } = require('./controllers/costos-productos.controller')
const { createTrazabilidadController } = require('./controllers/trazabilidad.controller')
const { createIncidenciasEstadosController } = require('./controllers/incidencias-estados.controller')
const { createEstadisticasController } = require('./controllers/estadisticas.controller')
const { createReportesController } = require('./controllers/reportes.controller')
const { createNlpController } = require('./controllers/nlp.controller')

// Enrutadores Kaotrace
const { createTransformacionesRouter } = require('./routes/transformaciones.routes')
const { createProductosRouter } = require('./routes/productos.routes')
const { createTrazabilidadRouter } = require('./routes/trazabilidad.routes')
const { createIncidenciasEstadosRouter } = require('./routes/incidencias-estados.routes')
const { createEstadisticasRouter } = require('./routes/estadisticas.routes')
const { createReportesRouter } = require('./routes/reportes.routes')
const { createNlpRouter } = require('./routes/nlp.routes')

/**
 * Factoría para inicializar la aplicación Express con inyección de dependencias.
 *
 * @param {Object} [options] - Dependencias opcionales.
 * @param {import('drizzle-orm/postgres-js').PostgresJsDatabase} [options.db] - Instancia Drizzle ORM.
 * @param {Object} [options.authModel] - Modelo de autenticación.
 * @param {Object} [options.authService] - Servicio de autenticación.
 * @param {string} [options.jwtSecret] - Secreto JWT.
 * @param {string} [options.tokenExpiresIn] - Tiempo de vida del token.
 * @returns {import('express').Express} Aplicación Express configurada.
 */
function createApp({
  db,
  authModel,
  authService,
  jwtSecret,
  tokenExpiresIn,
  transformacionesService,
  productosService,
  trazabilidadService,
  incidenciasEstadosService,
  estadisticasService,
  reportesService,
  nlpService,
} = {}) {
  const app = express()

  // 1. Capa de Autenticación
  const resolvedAuthModel = authModel || (db ? createAuthModel(db) : null)
  const resolvedAuthService =
    authService ||
    (resolvedAuthModel
      ? createAuthService({
          authModel: resolvedAuthModel,
          jwtSecret,
          tokenExpiresIn,
        })
      : null)

  const authController = resolvedAuthService ? createAuthController(resolvedAuthService) : null
  const authenticate = resolvedAuthService ? createAuthenticationMiddleware(resolvedAuthService) : null

  // 2. Capa de Modelos
  const lotesModel = db ? createLotesModel(db) : null
  const transformacionesModel = db ? createTransformacionesModel(db) : null
  const productosModel = db ? createProductosModel(db) : null
  const trazabilidadModel = db ? createTrazabilidadModel(db) : null
  const incidenciasEstadosModel = db ? createIncidenciasEstadosModel(db) : null
  const estadisticasModel = db ? createEstadisticasModel(db) : null

  // 3. Capa de Servicios de Negocio
  const resolvedTransformacionesService =
    transformacionesService ||
    (transformacionesModel && lotesModel
      ? createTransformacionesService({ transformacionesModel, lotesModel })
      : null)

  const resolvedProductosService =
    productosService ||
    (productosModel
      ? createProductosService({ productosModel, transformacionesModel })
      : null)

  const resolvedTrazabilidadService =
    trazabilidadService ||
    (trazabilidadModel
      ? createTrazabilidadService({ trazabilidadModel })
      : null)

  const resolvedIncidenciasEstadosService =
    incidenciasEstadosService ||
    (incidenciasEstadosModel
      ? createIncidenciasEstadosService({ incidenciasEstadosModel, lotesModel })
      : null)

  const resolvedEstadisticasService =
    estadisticasService ||
    (estadisticasModel
      ? createEstadisticasService({ estadisticasModel })
      : null)

  const resolvedReportesService =
    reportesService ||
    (estadisticasModel
      ? createReportesService({ estadisticasModel })
      : null)

  const resolvedNlpService =
    nlpService ||
    (estadisticasModel
      ? createNlpService({ estadisticasModel })
      : null)

  // Middlewares globales
  app.use(cors())
  app.use(express.json({ limit: '64kb' }))

  // Healthcheck
  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok', service: 'kaotrace-backend' })
  })

  // Montaje de rutas de autenticación
  if (authController && authenticate) {
    app.use('/api/auth', createAuthRouter({ controller: authController, authenticate }))
  }

  // Montaje de rutas de Kaotrace (exigen autenticación)
  if (authenticate) {
    if (resolvedTransformacionesService) {
      const transformacionesController = createTransformacionesController(resolvedTransformacionesService)
      app.use('/api/transformaciones', createTransformacionesRouter({ controller: transformacionesController, authenticate }))
    }

    if (resolvedProductosService) {
      const productosController = createCostosProductosController(resolvedProductosService)
      app.use('/api/productos', createProductosRouter({ controller: productosController, authenticate }))
    }

    if (resolvedTrazabilidadService) {
      const trazabilidadController = createTrazabilidadController(resolvedTrazabilidadService)
      app.use('/api/trazabilidad', createTrazabilidadRouter({ controller: trazabilidadController, authenticate }))
    }

    if (resolvedIncidenciasEstadosService) {
      const incidenciasEstadosController = createIncidenciasEstadosController(resolvedIncidenciasEstadosService)
      app.use('/api', createIncidenciasEstadosRouter({ controller: incidenciasEstadosController, authenticate }))
    }

    if (resolvedEstadisticasService) {
      const estadisticasController = createEstadisticasController(resolvedEstadisticasService)
      app.use('/api/estadisticas', createEstadisticasRouter({ controller: estadisticasController, authenticate }))
    }

    if (resolvedReportesService) {
      const reportesController = createReportesController(resolvedReportesService)
      app.use('/api/reportes', createReportesRouter({ controller: reportesController, authenticate }))
    }

    if (resolvedNlpService) {
      const nlpController = createNlpController(resolvedNlpService)
      app.use('/api/nlp', createNlpRouter({ controller: nlpController, authenticate }))
    }
  }

  // Manejo centralizado de errores
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

    if (error.statusCode) {
      return response.status(error.statusCode).json({ error: error.message })
    }

    console.error('Error interno del servidor:', error)
    return response.status(500).json({ error: 'Error interno del servidor' })
  })

  return app
}

module.exports = { createApp }