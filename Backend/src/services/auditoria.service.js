function createAuditoriaService({ auditoriaModel }) {
  if (!auditoriaModel) {
    throw new Error('auditoriaModel es una dependencia obligatoria')
  }

  return {
    async listEvents(limit) {
      return auditoriaModel.listEvents(limit)
    },

    async listRecentMovements(limit) {
      return auditoriaModel.listRecentMovements(limit)
    },
  }
}

module.exports = { createAuditoriaService }
