const { validateEstadisticasQuery } = require('../validators/estadisticas.validator')
const { validateCreateVentaBody } = require('../validators/ventas.validator')

function createVentasController(ventasService) {
  if (!ventasService) {
    throw new Error('ventasService es requerido para el controlador')
  }

  return {
    async create(request, response, next) {
      const validation = validateCreateVentaBody(request.body, request.get('Idempotency-Key'))
      if (validation.error) return response.status(400).json({ error: validation.error })
      try {
        const venta = await ventasService.create({
          ...validation.value,
          usuarioId: request.user.id,
        })
        return response.status(venta.idempotente ? 200 : 201).json({ venta })
      } catch (error) {
        if (error.statusCode) return response.status(error.statusCode).json({ error: error.message })
        return next(error)
      }
    },

    async list(request, response, next) {
      const validation = validateEstadisticasQuery(request.query)
      if (validation.error) return response.status(400).json({ error: validation.error })
      const limit = request.query.limit === undefined ? 100 : Number(request.query.limit)
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
        return response.status(400).json({ error: 'limit debe ser un entero entre 1 y 500' })
      }
      try {
        const ventas = await ventasService.list({ ...validation.value, limit })
        const resumen = ventas.reduce((total, sale) => ({
          totalVentas: total.totalVentas + 1,
          cantidadKg: total.cantidadKg + sale.cantidadKg,
          ingresosCop: total.ingresosCop + sale.totalCop,
        }), { totalVentas: 0, cantidadKg: 0, ingresosCop: 0 })
        resumen.ingresosCop = Number(resumen.ingresosCop.toFixed(2))
        resumen.cantidadKg = Number(resumen.cantidadKg.toFixed(3))
        return response.status(200).json({ ventas, resumen })
      } catch (error) {
        return next(error)
      }
    },
  }
}

module.exports = { createVentasController }
