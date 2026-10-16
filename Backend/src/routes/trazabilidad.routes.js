/**
 * @fileoverview Definición de rutas Express para reconstrucción de trazabilidad del cacao.
 */

const { Router } = require('express')

/**
 * Crea el enrutador para endpoints de trazabilidad.
 *
 * @param {Object} options
 * @param {Object} options.controller - Controlador de trazabilidad.
 * @param {Function} options.authenticate - Middleware de autenticación JWT.
 * @returns {import('express').Router}
 */
function createTrazabilidadRouter({ controller, authenticate }) {
  const router = Router()

  router.get('/lote/:codigo', authenticate, controller.getTrazabilidadPorCodigo)

  return router
}

module.exports = {
  createTrazabilidadRouter,
}
