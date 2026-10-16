/**
 * @fileoverview Definición de rutas Express para catálogo comercial, costos y análisis de márgenes.
 */

const { Router } = require('express')
const { requireRoles } = require('../middlewares/auth.middleware')

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

  router.get('/', authenticate, requireRoles('ADMINISTRADOR', 'OPERADOR'), controller.listProductos)
  router.get('/:id', authenticate, requireRoles('ADMINISTRADOR', 'OPERADOR'), controller.getProductoById)
  router.post('/', authenticate, requireRoles('ADMINISTRADOR'), controller.createProducto)
  router.post('/:id/costos', authenticate, requireRoles('ADMINISTRADOR'), controller.addCosto)
  router.get('/:id/margenes', authenticate, requireRoles('ADMINISTRADOR'), controller.getMargenes)

  return router
}

module.exports = {
  createProductosRouter,
}
