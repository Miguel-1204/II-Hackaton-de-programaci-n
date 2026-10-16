/**
 * @fileoverview Servicio de negocio para la reconstrucción de trazabilidad del grano de cacao.
 */

/**
 * Factoría que instancia el servicio de trazabilidad.
 *
 * @param {Object} dependencies - Dependencias inyectadas.
 * @param {Object} dependencies.trazabilidadModel - Modelo de trazabilidad.
 * @returns {Object} Métodos de trazabilidad.
 */
function createTrazabilidadService({ trazabilidadModel }) {
  if (!trazabilidadModel) {
    throw new Error('trazabilidadModel es una dependencia obligatoria')
  }

  return {
    /**
     * Reconstruye el ciclo de vida y recorrido integral de un lote de cacao a partir de su código comercial.
     *
     * @param {string} codigoLote - Código del lote (ej. 'CAC001').
     * @returns {Promise<Object>} Árbol estructurado de trazabilidad, orígenes campesinos, transformaciones e incidencias.
     */
    async getTrazabilidadPorCodigo(codigoLote) {
      if (!codigoLote || typeof codigoLote !== 'string') {
        const err = new Error('El código del lote es obligatorio')
        err.statusCode = 400
        throw err
      }

      const trazabilidad = await trazabilidadModel.getTrazabilidadCompleta(codigoLote.trim())
      if (!trazabilidad) {
        const err = new Error(`No se encontró ningún lote con el código "${codigoLote}"`)
        err.statusCode = 404
        throw err
      }

      return trazabilidad
    },
  }
}

module.exports = {
  createTrazabilidadService,
}
