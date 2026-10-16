const { Router } = require('express')
const { requireRoles } = require('../middlewares/auth.middleware')

function createInventarioRouter({ controller, authenticate }) {
  const router = Router()
  router.post('/recepciones', authenticate, requireRoles('ADMINISTRADOR', 'OPERADOR'), controller.receive)
  router.get('/inventario/lotes', authenticate, requireRoles('ADMINISTRADOR', 'OPERADOR'), controller.list)
  router.get('/inventario/lotes/:id/movimientos', authenticate, requireRoles('ADMINISTRADOR', 'OPERADOR'), controller.listMovements)
  router.get('/inventario/lotes/:id', authenticate, requireRoles('ADMINISTRADOR', 'OPERADOR'), controller.getBalance)
  return router
}

module.exports = { createInventarioRouter }
