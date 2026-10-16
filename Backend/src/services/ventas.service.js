function createVentasService({ ventasModel }) {
  if (!ventasModel) {
    throw new Error('ventasModel es una dependencia obligatoria')
  }

  return {
    async create(data) {
      return ventasModel.create(data)
    },

    async list(filters) {
      return ventasModel.list(filters)
    },
  }
}

module.exports = { createVentasService }
