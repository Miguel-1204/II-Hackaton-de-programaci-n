/**
 * @fileoverview Controlador HTTP para la consulta del árbol de trazabilidad de lotes de cacao.
 */

/**
 * Factoría que instancia el controlador de trazabilidad.
 *
 * @param {Object} trazabilidadService - Servicio de trazabilidad.
 * @returns {Object} Métodos de manejo de peticiones Express.
 */
function createTrazabilidadController(trazabilidadService) {
  if (!trazabilidadService) {
    throw new Error('trazabilidadService es requerido para el controlador')
  }

  return {
    /**
     * Reconstruye el árbol de trazabilidad completo de un lote a partir de su código comercial.
     *
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @param {import('express').NextFunction} next
     */
    async getTrazabilidadPorCodigo(request, response, next) {
      const { codigo } = request.params
      if (!codigo || !codigo.trim()) {
        return response.status(400).json({ error: 'El código del lote es obligatorio en la ruta' })
      }

      try {
        const trazabilidad = await trazabilidadService.getTrazabilidadPorCodigo(codigo.trim())
        return response.status(200).json(trazabilidad)
      } catch (error) {
        if (error.statusCode) {
          return response.status(error.statusCode).json({ error: error.message })
        }
        return next(error)
      }
    },
  }
}

module.exports = {
  createTrazabilidadController,
}
