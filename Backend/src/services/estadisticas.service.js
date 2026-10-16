/**
 * @fileoverview Servicio de negocio para la consulta de estadísticas y métricas analíticas parametrizadas.
 */

/**
 * Factoría que instancia el servicio de estadísticas.
 *
 * @param {Object} dependencies - Dependencias inyectadas.
 * @param {Object} dependencies.estadisticasModel - Modelo de consultas analíticas.
 * @returns {Object} Métodos de consulta de estadísticas.
 */
function createEstadisticasService({ estadisticasModel }) {
  if (!estadisticasModel) {
    throw new Error('estadisticasModel es una dependencia obligatoria')
  }

  return {
    /**
     * Obtiene el resumen global del sistema Kaotrace.
     *
     * @param {Object} [filters] - Filtros temporales.
     * @returns {Promise<Object>} Métricas de transformación, mermas globales, costos e inventario.
     */
    async getResumenGlobal(filters = {}) {
      return await estadisticasModel.getResumenGlobal(filters)
    },

    /**
     * Obtiene el detalle de mermas atribuibles por productor.
     *
     * @param {Object} [filters] - Filtros (fechas, municipio, productorId, superaUmbral).
     * @returns {Promise<Array<Object>>}
     */
    async getMermasPorProductor(filters = {}) {
      return await estadisticasModel.getMermasPorProductor(filters)
    },

    /**
     * Obtiene los costos por transformación.
     *
     * @param {Object} [filters] - Filtros.
     * @returns {Promise<Array<Object>>}
     */
    async getCostos(filters = {}) {
      return await estadisticasModel.getCostos(filters)
    },

    /**
     * Obtiene el estado actual de inventario por lote.
     *
     * @param {Object} [filters] - Filtros.
     * @returns {Promise<Array<Object>>}
     */
    async getInventario(filters = {}) {
      return await estadisticasModel.getInventario(filters)
    },

    /**
     * Obtiene el estado de los lotes y bloqueos activos.
     *
     * @returns {Promise<Array<Object>>}
     */
    async getEstadoLotes() {
      return await estadisticasModel.getEstadoLotes()
    },

    /**
     * Obtiene las incidencias registradas en la vista analítica.
     *
     * @param {Object} [filters] - Filtros.
     * @returns {Promise<Array<Object>>}
     */
    async getIncidencias(filters = {}) {
      return await estadisticasModel.getIncidencias(filters)
    },
  }
}

module.exports = {
  createEstadisticasService,
}
