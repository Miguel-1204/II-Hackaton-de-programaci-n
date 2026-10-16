const { Router } = require('express')
const { requireRoles } = require('../middlewares/auth.middleware')

function createAuditoriaRouter({ controller, authenticate }) {
  const router = Router()
  router.use(authenticate, requireRoles('ADMINISTRADOR'))
  router.get('/', controller.listEvents)
  router.get('/movimientos-recientes', controller.listRecentMovements)
  return router
}

module.exports = { createAuditoriaRouter }
