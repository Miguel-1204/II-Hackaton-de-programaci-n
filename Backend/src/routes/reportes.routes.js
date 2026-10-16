/**
 * @fileoverview Definición de rutas Express para generación y descarga de reportes ejecutivos en PDF.
 */

const { Router } = require('express')
const { requireRoles } = require('../middlewares/auth.middleware')

/**
 * Crea el enrutador para la descarga de reportes PDF.
 *
 * @param {Object} options
 * @param {Object} options.controller - Controlador de reportes.
 * @param {Function} options.authenticate - Middleware de autenticación JWT.
 * @returns {import('express').Router}
 */
function createReportesRouter({ controller, authenticate }) {
  const router = Router()

  router.get(
    '/merma-productor/pdf',
    authenticate,
    requireRoles('ADMINISTRADOR'),
    controller.descargarReporteMermaPdf,
  )
  router.get(
    '/inventario.csv',
    authenticate,
    requireRoles('ADMINISTRADOR'),
    controller.descargarInventarioCsv,
  )

  return router
}

module.exports = {
  createReportesRouter,
}
