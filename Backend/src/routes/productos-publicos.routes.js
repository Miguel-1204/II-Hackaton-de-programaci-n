const { Router } = require('express')

function createProductosPublicosRouter(controller) {
  const router = Router()
  router.get('/:codigo', controller.getFichaPublica)
  return router
}

module.exports = { createProductosPublicosRouter }
