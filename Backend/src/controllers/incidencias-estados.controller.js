/**
 * @fileoverview Controlador HTTP para gestión de incidencias, bloqueo administrativo de lotes e historial de estados.
 */

const {
  validateCreateIncidenciaBody,
  validateUpdateEstadoLoteBody,
} = require('../validators/incidencias-estados.validator')

/**
 * Factoría que instancia el controlador de incidencias y estados de lotes.
 *
 * @param {Object} incidenciasEstadosService - Servicio de incidencias y estados.
 * @returns {Object} Métodos de manejo de peticiones Express.
 */
function createIncidenciasEstadosController(incidenciasEstadosService) {
  if (!incidenciasEstadosService) {
    throw new Error('incidenciasEstadosService es requerido para el controlador')
  }

  return {
    async getCriticalOpenCount(request, response, next) {
      try {
        const total = await incidenciasEstadosService.getCriticalOpenCount()
        return response.status(200).json({ total })
      } catch (error) {
        return next(error)
      }
    },

    /**
     * Registra una nueva incidencia operativa o de calidad.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async createIncidencia(request, response, next) {
      const validation = validateCreateIncidenciaBody(request.body)
      if (validation.error) {
        return response.status(400).json({ error: validation.error })
      }

      try {
        const payload = {
          ...validation.value,
          usuarioId: request.user.id,
        }
        const nueva = await incidenciasEstadosService.createIncidencia(payload)
        return response.status(201).json(nueva)
      } catch (error) {
        if (error.statusCode) {
          return response.status(error.statusCode).json({ error: error.message })
        }
        return next(error)
      }
    },

    /**
     * Lista incidencias registradas.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async listIncidencias(request, response, next) {
      try {
        const filters = {}
        if (request.query.loteId) filters.loteId = Number(request.query.loteId)
        if (request.query.estado) filters.estado = String(request.query.estado).toUpperCase()
        if (request.query.severidad) filters.severidad = String(request.query.severidad).toUpperCase()

        const incidencias = await incidenciasEstadosService.listIncidencias(filters)
        return response.status(200).json({ incidencias })
      } catch (error) {
        return next(error)
      }
    },

    /**
     * Actualiza el estado de un lote (bloqueo / liberación).
     * Requiere rol ADMINISTRADOR y motivo obligatorio.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async updateEstadoLote(request, response, next) {
      const loteId = Number(request.params.id)
      if (!Number.isSafeInteger(loteId) || loteId <= 0) {
        return response.status(400).json({ error: 'ID de lote inválido' })
      }

      const validation = validateUpdateEstadoLoteBody(request.body)
      if (validation.error) {
        return response.status(400).json({ error: validation.error })
      }

      try {
        const result = await incidenciasEstadosService.updateEstadoLote(
          loteId,
          request.user,
          validation.value.estadoNuevo,
          validation.value.motivo,
        )
        return response.status(200).json(result)
      } catch (error) {
        if (error.statusCode) {
          return response.status(error.statusCode).json({ error: error.message })
        }
        return next(error)
      }
    },

    /**
     * Obtiene el historial cronológico de cambios de estado de un lote.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async getHistorialEstados(request, response, next) {
      const loteId = Number(request.params.id)
      if (!Number.isSafeInteger(loteId) || loteId <= 0) {
        return response.status(400).json({ error: 'ID de lote inválido' })
      }

      try {
        const historial = await incidenciasEstadosService.getHistorialEstados(loteId)
        return response.status(200).json({ historial })
      } catch (error) {
        return next(error)
      }
    },
  }
}

module.exports = {
  createIncidenciasEstadosController,
}
