const { Router } = require('express')
const { requireRoles } = require('../middlewares/auth.middleware')

function createProductoresRouter({ controller, authenticate }) {
  const router = Router()
  router.use(authenticate, requireRoles('ADMINISTRADOR', 'OPERADOR'))
  router.get('/', controller.list)
  router.get('/:id', controller.getById)
  router.post('/', requireRoles('ADMINISTRADOR'), controller.create)
  router.patch('/:id', requireRoles('ADMINISTRADOR'), controller.update)
  router.delete('/:id', requireRoles('ADMINISTRADOR'), controller.deactivate)
  return router
}

module.exports = { createProductoresRouter }
