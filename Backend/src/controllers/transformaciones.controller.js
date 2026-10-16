/**
 * @fileoverview Controlador HTTP para el registro y consulta de procesos de transformación de cacao.
 */

const { validateCreateTransformacionBody } = require('../validators/transformaciones.validator')

/**
 * Factoría que instancia el controlador de transformaciones.
 *
 * @param {Object} transformacionesService - Servicio de transformaciones.
 * @returns {Object} Métodos de manejo de peticiones Express.
 */
function createTransformacionesController(transformacionesService) {
  if (!transformacionesService) {
    throw new Error('transformacionesService es requerido para el controlador')
  }

  return {
    /**
     * Endpoint para registrar un nuevo proceso de transformación.
     * Valida existencias, idempotencia y cálculo de mermas.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async create(request, response, next) {
      const validation = validateCreateTransformacionBody(request.body)
      if (validation.error) {
        return response.status(400).json({ error: validation.error })
      }

      try {
        const payload = {
          ...validation.value,
          responsableId: request.user.id,
        }

        const result = await transformacionesService.createTransformacion(payload)
        const statusCode = result.idempotente ? 200 : 201

        return response.status(statusCode).json(result)
      } catch (error) {
        if (error.statusCode) {
          return response.status(error.statusCode).json({ error: error.message })
        }
        return next(error)
      }
    },

    /**
     * Endpoint para obtener el detalle de una transformación por ID.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async getById(request, response, next) {
      const id = Number(request.params.id)
      if (!Number.isSafeInteger(id) || id <= 0) {
        return response.status(400).json({ error: 'El ID de la transformación debe ser un número entero positivo' })
      }

      try {
        const trans = await transformacionesService.getTransformacionById(id)
        return response.status(200).json(trans)
      } catch (error) {
        if (error.statusCode) {
          return response.status(error.statusCode).json({ error: error.message })
        }
        return next(error)
      }
    },

    /**
     * Endpoint para listar transformaciones registradas.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async list(request, response, next) {
      try {
        const limit = Number(request.query.limit) || 50
        const items = await transformacionesService.listTransformaciones(limit)
        return response.status(200).json({ items })
      } catch (error) {
        return next(error)
      }
    },
  }
}

module.exports = {
  createTransformacionesController,
}
