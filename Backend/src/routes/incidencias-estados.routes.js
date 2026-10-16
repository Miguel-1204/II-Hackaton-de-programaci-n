/**
 * @fileoverview Definición de rutas Express para incidencias, historial y control de estados de lotes.
 */

const { Router } = require('express')
const { requireRoles } = require('../middlewares/auth.middleware')

/**
 * Crea el enrutador para incidencias y gestión de estados de lotes.
 * El bloqueo o liberación de lotes requiere permisos exclusivos de ADMINISTRADOR.
 *
 * @param {Object} options
 * @param {Object} options.controller - Controlador de incidencias y estados.
 * @param {Function} options.authenticate - Middleware de autenticación JWT.
 * @returns {import('express').Router}
 */
function createIncidenciasEstadosRouter({ controller, authenticate }) {
  const router = Router()

  router.post('/incidencias', authenticate, controller.createIncidencia)
  router.get('/incidencias', authenticate, controller.listIncidencias)
  router.patch('/lotes/:id/estado', authenticate, requireRoles('ADMINISTRADOR'), controller.updateEstadoLote)
  router.get('/lotes/:id/historial-estados', authenticate, controller.getHistorialEstados)

  return router
}

module.exports = {
  createIncidenciasEstadosRouter,
}
