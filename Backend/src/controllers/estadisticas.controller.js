/**
 * @fileoverview Controlador HTTP para consultas analíticas y estadísticas de Kaotrace.
 */

const { validateEstadisticasQuery } = require('../validators/estadisticas.validator')

/**
 * Factoría que instancia el controlador de estadísticas analíticas.
 *
 * @param {Object} estadisticasService - Servicio de estadísticas.
 * @returns {Object} Métodos de manejo de peticiones Express.
 */
function createEstadisticasController(estadisticasService) {
  if (!estadisticasService) {
    throw new Error('estadisticasService es requerido para el controlador')
  }

  return {
    /**
     * Obtiene el resumen general de indicadores clave de desempeño (KPIs) de Kaotrace.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async getResumenGlobal(request, response, next) {
      try {
        const resumen = await estadisticasService.getResumenGlobal()
        return response.status(200).json(resumen)
      } catch (error) {
        return next(error)
      }
    },

    /**
     * Consulta el detalle parametrizado de mermas atribuibles por productor.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async getMermasPorProductor(request, response, next) {
      const validation = validateEstadisticasQuery(request.query)
      if (validation.error) {
        return response.status(400).json({ error: validation.error })
      }

      try {
        const items = await estadisticasService.getMermasPorProductor(validation.value)
        return response.status(200).json({ items })
      } catch (error) {
        return next(error)
      }
    },

    /**
     * Consulta los costos por transformación y moneda.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async getCostos(request, response, next) {
      const validation = validateEstadisticasQuery(request.query)
      if (validation.error) {
        return response.status(400).json({ error: validation.error })
      }

      try {
        const costos = await estadisticasService.getCostos(validation.value)
        return response.status(200).json({ costos })
      } catch (error) {
        return next(error)
      }
    },

    /**
     * Consulta el saldo de inventario actual por lote.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async getInventario(request, response, next) {
      const validation = validateEstadisticasQuery(request.query)
      if (validation.error) {
        return response.status(400).json({ error: validation.error })
      }

      try {
        const inventario = await estadisticasService.getInventario(validation.value)
        return response.status(200).json({ inventario })
      } catch (error) {
        return next(error)
      }
    },

    /**
     * Consulta el estado de lotes e incidencias asociadas.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async getEstadoLotes(request, response, next) {
      try {
        const estados = await estadisticasService.getEstadoLotes()
        return response.status(200).json({ estados })
      } catch (error) {
        return next(error)
      }
    },

    /**
     * Consulta las dimensiones de incidencias analíticas.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async getIncidencias(request, response, next) {
      try {
        const soloAbiertas = request.query.abiertas === 'true'
        const incidencias = await estadisticasService.getIncidencias({ soloAbiertas })
        return response.status(200).json({ incidencias })
      } catch (error) {
        return next(error)
      }
    },
  }
}

module.exports = {
  createEstadisticasController,
}
