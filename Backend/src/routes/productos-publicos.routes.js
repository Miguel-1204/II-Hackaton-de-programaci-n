const { Router } = require('express')

function createProductosPublicosRouter(controller) {
  const router = Router()
  router.get('/', controller.listProductosPublicos)
  router.get('/:codigo', controller.getFichaPublica)
  return router
}

module.exports = { createProductosPublicosRouter }
