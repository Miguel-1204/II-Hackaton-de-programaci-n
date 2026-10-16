/**
 * @fileoverview Definición de rutas Express para generación y descarga de reportes ejecutivos en PDF.
 */

const { Router } = require('express')

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

  router.get('/merma-productor/pdf', authenticate, controller.descargarReporteMermaPdf)

  return router
}

module.exports = {
  createReportesRouter,
}
