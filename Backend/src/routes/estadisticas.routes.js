/**
 * @fileoverview Definición de rutas Express para consultas estadísticas y analíticas de Kaotrace.
 */

const { Router } = require('express')

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

  router.get('/resumen', authenticate, controller.getResumenGlobal)
  router.get('/mermas-productor', authenticate, controller.getMermasPorProductor)
  router.get('/costos', authenticate, controller.getCostos)
  router.get('/inventario', authenticate, controller.getInventario)
  router.get('/estado-lotes', authenticate, controller.getEstadoLotes)
  router.get('/incidencias', authenticate, controller.getIncidencias)

  return router
}

module.exports = {
  createEstadisticasRouter,
}
