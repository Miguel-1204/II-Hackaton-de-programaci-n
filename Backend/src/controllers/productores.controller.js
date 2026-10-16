const {
  validateProducerBody,
  validateProducerQuery,
} = require('../validators/productores.validator')

const SAFE_PRODUCER_FIELDS = ['id', 'nombre', 'municipio', 'activo']

function serializeProducer(producer, canReadIdentification) {
  if (canReadIdentification) return producer
  return Object.fromEntries(
    Object.entries(producer).filter(([key]) => SAFE_PRODUCER_FIELDS.includes(key)),
  )
}

function createProductoresController(productoresService) {
  return {
    async create(request, response, next) {
      const validation = validateProducerBody(request.body)
      if (validation.error) return response.status(400).json({ error: validation.error })
      try {
        const producer = await productoresService.create(validation.value)
        return response.status(201).json({
          productor: serializeProducer(producer, true),
        })
      } catch (error) {
        if (error.statusCode) return response.status(error.statusCode).json({ error: error.message })
        return next(error)
      }
    },

    async list(request, response, next) {
      const validation = validateProducerQuery(request.query)
      if (validation.error) return response.status(400).json({ error: validation.error })
      try {
        const isAdmin = request.user.roles.includes('ADMINISTRADOR')
        const filters = {
          ...validation.value,
          includeInactive: isAdmin && validation.value.includeInactive,
        }
        const result = await productoresService.list(filters)
        return response.status(200).json({
          ...result,
          items: result.items.map((producer) => serializeProducer(producer, isAdmin)),
        })
      } catch (error) {
        return next(error)
      }
    },

    async getById(request, response, next) {
      const id = Number(request.params.id)
      if (!Number.isSafeInteger(id) || id <= 0) {
        return response.status(400).json({ error: 'ID de productor inválido' })
      }
      try {
        const producer = await productoresService.getById(id)
        return response.status(200).json({
          productor: serializeProducer(
            producer,
            request.user.roles.includes('ADMINISTRADOR'),
          ),
        })
      } catch (error) {
        if (error.statusCode) return response.status(error.statusCode).json({ error: error.message })
        return next(error)
      }
    },

    async update(request, response, next) {
      const id = Number(request.params.id)
      if (!Number.isSafeInteger(id) || id <= 0) {
        return response.status(400).json({ error: 'ID de productor inválido' })
      }
      const validation = validateProducerBody(request.body, { partial: true })
      if (validation.error) return response.status(400).json({ error: validation.error })
      try {
        const producer = await productoresService.update(id, validation.value)
        return response.status(200).json({ productor: producer })
      } catch (error) {
        if (error.statusCode) return response.status(error.statusCode).json({ error: error.message })
        return next(error)
      }
    },

    async deactivate(request, response, next) {
      const id = Number(request.params.id)
      if (!Number.isSafeInteger(id) || id <= 0) {
        return response.status(400).json({ error: 'ID de productor inválido' })
      }
      try {
        const producer = await productoresService.deactivate(id)
        return response.status(200).json({
          productor: producer,
          mensaje: 'Productor desactivado; se conservaron sus lotes y movimientos',
        })
      } catch (error) {
        if (error.statusCode) return response.status(error.statusCode).json({ error: error.message })
        return next(error)
      }
    },
  }
}

module.exports = { createProductoresController }
