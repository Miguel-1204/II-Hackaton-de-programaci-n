/**
 * @fileoverview Definición de rutas Express para catálogo comercial, costos y análisis de márgenes.
 */

const { Router } = require('express')

/**
 * Crea el enrutador para catálogo de productos, registro de costos y márgenes comerciales.
 *
 * @param {Object} options
 * @param {Object} options.controller - Controlador de costos y productos.
 * @param {Function} options.authenticate - Middleware de autenticación JWT.
 * @returns {import('express').Router}
 */
function createProductosRouter({ controller, authenticate }) {
  const router = Router()

  router.post('/', authenticate, controller.createProducto)
  router.get('/', authenticate, controller.listProductos)
  router.get('/:id', authenticate, controller.getProductoById)
  router.post('/:id/costos', authenticate, controller.addCosto)
  router.get('/:id/margenes', authenticate, controller.getMargenes)

  return router
}

module.exports = {
  createProductosRouter,
}
