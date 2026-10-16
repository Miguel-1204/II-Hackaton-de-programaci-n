/**
 * @fileoverview Controlador HTTP para el intérprete seguro de consultas estadísticas en lenguaje natural.
 */

const { validateNlpQueryBody } = require('../validators/nlp.validator')

/**
 * Factoría que instancia el controlador de procesamiento de lenguaje natural.
 *
 * @param {Object} nlpService - Servicio NLP.
 * @returns {Object} Métodos de manejo de peticiones Express.
 */
function createNlpController(nlpService) {
  if (!nlpService) {
    throw new Error('nlpService es requerido para el controlador')
  }

  return {
    /**
     * Procesa una pregunta en lenguaje natural con acceso de solo lectura y devuelve datos analíticos parametrizados.
     * Requiere autenticación con rol ADMINISTRADOR.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async consultar(request, response, next) {
      const validation = validateNlpQueryBody(request.body)
      if (validation.error) {
        return response.status(400).json({ error: validation.error })
      }

      try {
        const resultado = await nlpService.procesarConsulta(validation.value.pregunta)
        return response.status(200).json(resultado)
      } catch (error) {
        return next(error)
      }
    },
  }
}

module.exports = {
  createNlpController,
}
