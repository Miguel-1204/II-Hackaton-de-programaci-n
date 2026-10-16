/**
 * @fileoverview Definición de rutas Express para procesos de transformación de cacao.
 */

const { Router } = require('express')

/**
 * Crea el enrutador para los endpoints de transformaciones.
 *
 * @param {Object} options
 * @param {Object} options.controller - Controlador de transformaciones.
 * @param {Function} options.authenticate - Middleware de autenticación JWT.
 * @returns {import('express').Router}
 */
function createTransformacionesRouter({ controller, authenticate }) {
  const router = Router()

  router.post('/', authenticate, controller.create)
  router.get('/', authenticate, controller.list)
  router.get('/:id', authenticate, controller.getById)

  return router
}

module.exports = {
  createTransformacionesRouter,
}
