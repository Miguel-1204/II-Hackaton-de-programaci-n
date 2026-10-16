const { Router } = require('express')
const { requireRoles } = require('../middlewares/auth.middleware')

function createVentasRouter({ controller, authenticate }) {
  const router = Router()
  router.use(authenticate, requireRoles('ADMINISTRADOR'))
  router.get('/', controller.list)
  router.post('/', controller.create)
  return router
}

module.exports = { createVentasRouter }
