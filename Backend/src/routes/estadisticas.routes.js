/**
 * @fileoverview Definición de rutas Express para consultas estadísticas y analíticas de Kaotrace.
 */

const { Router } = require('express')
const { requireRoles } = require('../middlewares/auth.middleware')

/**
 * Crea el enrutador para estadísticas y vistas analíticas.
 *
 * @param {Object} options
 * @param {Object} options.controller - Controlador de estadísticas.
 * @param {Function} options.authenticate - Middleware de autenticación JWT.
 * @returns {import('express').Router}
 */
function createEstadisticasRouter({ controller, authenticate }) {
  const router = Router()

  router.use(authenticate, requireRoles('ADMINISTRADOR'))
  router.get('/resumen', controller.getResumenGlobal)
  router.get('/mermas-productor', controller.getMermasPorProductor)
  router.get('/costos', controller.getCostos)
  router.get('/inventario', controller.getInventario)
  router.get('/estado-lotes', controller.getEstadoLotes)
  router.get('/incidencias', controller.getIncidencias)

  return router
}

module.exports = {
  createEstadisticasRouter,
}
