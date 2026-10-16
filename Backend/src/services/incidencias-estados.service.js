/**
 * @fileoverview Servicio de negocio para registro de incidencias, gestión de estados y bloqueo administrativo de lotes.
 */

/**
 * Factoría que instancia el servicio de incidencias y estados de lotes.
 *
 * @param {Object} dependencies - Dependencias inyectadas.
 * @param {Object} dependencies.incidenciasEstadosModel - Modelo de incidencias y estados.
 * @param {Object} dependencies.lotesModel - Modelo de lotes.
 * @returns {Object} Métodos de negocio para incidencias y control de estados.
 */
function createIncidenciasEstadosService({ incidenciasEstadosModel, lotesModel }) {
  if (!incidenciasEstadosModel) {
    throw new Error('incidenciasEstadosModel es una dependencia obligatoria')
  }

  return {
    async getCriticalOpenCount() {
      return incidenciasEstadosModel.countCriticalOpenIncidencias()
    },

    /**
     * Registra una nueva incidencia operativa o de calidad asociada a un lote.
     *
     * @param {Object} data - Datos de la incidencia validados.
     * @param {number} data.loteId - ID del lote.
     * @param {number} [data.transformacionId] - ID de la transformación relacionada.
     * @param {number} data.usuarioId - ID del usuario informante.
     * @param {string} data.tipo - Categoría.
     * @param {string} data.descripcion - Descripción técnica del incidente.
     * @param {string} data.severidad - Severidad (BAJA, MEDIA, ALTA, CRITICA).
     * @param {string} data.estado - Estado (ABIERTA, EN_PROCESO, RESUELTA).
     * @returns {Promise<Object>} Registro de la incidencia creada.
     */
    async createIncidencia(data) {
      if (lotesModel) {
        const lote = await lotesModel.findById(data.loteId)
        if (!lote) {
          const err = new Error(`El lote con ID ${data.loteId} no existe`)
          err.statusCode = 404
          throw err
        }
      }

      return await incidenciasEstadosModel.createIncidencia(data)
    },

    /**
     * Lista las incidencias registradas con filtros opcionales.
     *
     * @param {Object} [filters] - Filtros.
     * @returns {Promise<Array<Object>>}
     */
    async listIncidencias(filters = {}) {
      return await incidenciasEstadosModel.listIncidencias(filters)
    },

    /**
     * Cambia el estado de un lote (bloqueo o liberación) validando que el usuario
     * tenga permisos exclusivos de ADMINISTRADOR y que se provea una justificación obligatoria.
     *
     * @param {number} loteId - ID del lote a modificar.
     * @param {Object} user - Usuario autenticado con sus roles.
     * @param {string} estadoNuevo - Nuevo estado (PENDIENTE, LIBERADO o BLOQUEADO).
     * @param {string} motivo - Motivo obligatorio registrado en historial de estados.
     * @returns {Promise<{ lote: Object, historial: Object }>}
     */
    async updateEstadoLote(loteId, user, estadoNuevo, motivo) {
      if (!user) {
        const err = new Error('Autenticación requerida para realizar cambios de estado')
        err.statusCode = 401
        throw err
      }

      // Validación estricta de permisos de ADMINISTRADOR
      const roles = Array.isArray(user.roles) ? user.roles : []
      if (!roles.includes('ADMINISTRADOR')) {
        const err = new Error('Solo los usuarios con rol ADMINISTRADOR tienen permiso para cambiar el estado de un lote')
        err.statusCode = 403
        throw err
      }

      // Validación de justificación obligatoria
      if (!motivo || typeof motivo !== 'string' || !motivo.trim()) {
        const err = new Error('El motivo es estrictamente obligatorio para registrar el cambio de estado en el historial')
        err.statusCode = 400
        throw err
      }

      const allowedStates = new Set([
        'PENDIENTE',
        'LIBERADO',
        'BLOQUEADO',
      ])
      if (!allowedStates.has(estadoNuevo)) {
        const err = new Error('Estado de lote no permitido')
        err.statusCode = 400
        throw err
      }

      if (lotesModel) {
        const lote = await lotesModel.findById(loteId)
        if (!lote) {
          const err = new Error(`El lote con ID ${loteId} no existe`)
          err.statusCode = 404
          throw err
        }
      }

      return await incidenciasEstadosModel.updateEstadoLote(loteId, user.id, estadoNuevo, motivo.trim())
    },

    /**
     * Obtiene el historial de estados de un lote.
     *
     * @param {number} loteId - ID del lote.
     * @returns {Promise<Array<Object>>}
     */
    async getHistorialEstados(loteId) {
      return await incidenciasEstadosModel.getHistorialEstados(loteId)
    },
  }
}

module.exports = {
  createIncidenciasEstadosService,
}
