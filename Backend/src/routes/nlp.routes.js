/**
 * @fileoverview Definición de rutas Express para el intérprete de consultas estadísticas en lenguaje natural.
 */

const { Router } = require('express')
const { requireRoles } = require('../middlewares/auth.middleware')

/**
 * Crea el enrutador para el intérprete NLP seguro de solo lectura.
 * Protegido con autenticación y rol obligatorio de ADMINISTRADOR.
 *
 * @param {Object} options
 * @param {Object} options.controller - Controlador NLP.
 * @param {Function} options.authenticate - Middleware de autenticación JWT.
 * @returns {import('express').Router}
 */
function createNlpRouter({ controller, authenticate }) {
  const router = Router()

  router.post('/consultar', authenticate, requireRoles('ADMINISTRADOR'), controller.consultar)

  return router
}

module.exports = {
  createNlpRouter,
}
