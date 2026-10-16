/**
 * @fileoverview Definición de rutas Express para procesos de transformación de cacao.
 */

const { Router } = require('express')
const { requireRoles } = require('../middlewares/auth.middleware')

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

  router.use(authenticate, requireRoles('ADMINISTRADOR', 'OPERADOR'))
  router.post('/', controller.create)
  router.get('/', controller.list)
  router.get('/:id', controller.getById)

  return router
}

module.exports = {
  createTransformacionesRouter,
}
