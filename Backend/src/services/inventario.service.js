const { cantidadAKg } = require('../utils/conversion')
const { httpError } = require('../utils/http-error')

function createInventarioService({ lotesModel }) {
  if (!lotesModel) {
    throw new Error('lotesModel es una dependencia obligatoria')
  }

  return {
    async receive(data, usuarioId) {
      if (cantidadAKg(data.cantidad, data.unidad) === null) {
        throw httpError(400, 'La unidad de recepción no permite calcular inventario comparable')
      }
      try {
        return await lotesModel.createReception({ ...data, usuarioId })
      } catch (error) {
        if (error.statusCode) throw error
        if (error.code === '23503' || error.cause?.code === '23503') {
          throw httpError(404, 'El productor o producto indicado no existe')
        }
        throw error
      }
    },

    list(filters) {
      return lotesModel.listInventory(filters)
    },

    async getBalance(loteId) {
      const lote = await lotesModel.findById(loteId)
      if (!lote) throw httpError(404, 'Lote no encontrado')
      const saldo = await lotesModel.getSaldoInventario(loteId)
      return { lote, inventario: saldo }
    },

    async listMovements(loteId, pagination) {
      const result = await lotesModel.listMovements(loteId, pagination)
      if (!result) throw httpError(404, 'Lote no encontrado')
      return result
    },
  }
}

module.exports = { createInventarioService }
