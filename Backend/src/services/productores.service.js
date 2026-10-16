const { httpError } = require('../utils/http-error')

function normalizeProducerData(data) {
  const result = {}
  if (data.nombre !== undefined) result.nombre = data.nombre.trim()
  if (data.identificacion !== undefined) {
    result.identificacion = data.identificacion.trim().toUpperCase()
  }
  if (data.municipio !== undefined) result.municipio = data.municipio.trim()
  return result
}

function createProductoresService({ productoresModel }) {
  if (!productoresModel) {
    throw new Error('productoresModel es una dependencia obligatoria')
  }

  function normalizeDatabaseError(error) {
    if (error.code === '23505' || error.cause?.code === '23505') {
      throw httpError(409, 'Ya existe un productor con esa identificación')
    }
    throw error
  }

  return {
    async create(data) {
      try {
        return await productoresModel.create(normalizeProducerData(data))
      } catch (error) {
        normalizeDatabaseError(error)
      }
    },

    async getById(id) {
      const producer = await productoresModel.findById(id)
      if (!producer) throw httpError(404, 'Productor no encontrado')
      return producer
    },

    list(filters) {
      return productoresModel.list(filters)
    },

    async update(id, data) {
      try {
        const producer = await productoresModel.update(
          id,
          normalizeProducerData(data),
        )
        if (!producer) throw httpError(404, 'Productor no encontrado')
        return producer
      } catch (error) {
        normalizeDatabaseError(error)
      }
    },

    async deactivate(id) {
      const producer = await productoresModel.deactivate(id)
      if (!producer) throw httpError(404, 'Productor no encontrado')
      return producer
    },
  }
}

module.exports = { createProductoresService }
