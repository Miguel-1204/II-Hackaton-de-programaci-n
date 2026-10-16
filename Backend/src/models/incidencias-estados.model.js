/**
 * @fileoverview Modelo de datos para incidencias operativas, control de estados y auditoría de bloqueos/liberaciones.
 */

const { eq, sql } = require('drizzle-orm')
const { incidencias, historialEstados, lotes, auditoriaEventos } = require('../db/schema')

/**
 * Factoría que instancia el modelo de incidencias y control de estados de lotes.
 *
 * @param {import('drizzle-orm/postgres-js').PostgresJsDatabase} db - Instancia de Drizzle ORM.
 * @returns {Object} Métodos para incidencias, cambios de estado y auditoría.
 */
function createIncidenciasEstadosModel(db) {
  if (!db) {
    throw new Error('La instancia de base de datos es requerida para el modelo de incidencias y estados')
  }

  return {
    /**
     * Registra una nueva incidencia operativa o de calidad.
     *
     * @param {Object} data - Datos de la incidencia.
     * @param {number} data.loteId - ID del lote afectado.
     * @param {number} [data.transformacionId] - ID de la transformación relacionada si aplica.
     * @param {number} data.usuarioId - ID del usuario que registra.
     * @param {string} data.tipo - Categoría de la incidencia.
     * @param {string} data.descripcion - Detalle técnico del hallazgo.
     * @param {string} data.severidad - Grado de severidad (BAJA, MEDIA, ALTA, CRITICA).
     * @param {string} data.estado - Estado inicial (ABIERTA, EN_PROCESO, RESUELTA).
     * @returns {Promise<Object>} Registro de la incidencia creada.
     */
    async createIncidencia(data) {
      const [nueva] = await db
        .insert(incidencias)
        .values({
          loteId: data.loteId,
          transformacionId: data.transformacionId,
          usuarioId: data.usuarioId,
          tipo: data.tipo,
          descripcion: data.descripcion,
          severidad: data.severidad,
          estado: data.estado,
        })
        .returning()

      return nueva
    },

    /**
     * Lista las incidencias registradas con información del lote y transformación.
     *
     * @param {Object} [filters] - Filtros opcionales.
     * @param {number} [filters.loteId] - Filtrar por lote.
     * @param {string} [filters.estado] - Filtrar por estado.
     * @param {string} [filters.severidad] - Filtrar por severidad.
     * @returns {Promise<Array<Object>>}
     */
    async listIncidencias(filters = {}) {
      let query = db.select().from(incidencias)

      if (filters.loteId) {
        query = query.where(eq(incidencias.loteId, filters.loteId))
      }

      return await query.orderBy(incidencias.creadaEn)
    },

    /**
     * Actualiza el estado de un lote registrando obligatoriamente el motivo en el historial de estados
     * y emitiendo un evento en la tabla de auditoría.
     *
     * @param {number} loteId - ID del lote.
     * @param {number} usuarioId - ID del usuario que autoriza el cambio.
     * @param {string} estadoNuevo - Nuevo estado (ej. BLOQUEADO, LIBERADO, DISPONIBLE).
     * @param {string} motivo - Justificación obligatoria del cambio.
     * @returns {Promise<{ lote: Object, historial: Object }>}
     */
    async updateEstadoLote(loteId, usuarioId, estadoNuevo, motivo) {
      return await db.transaction(async (tx) => {
        const [loteActual] = await tx.execute(sql`
          SELECT id, estado, codigo
          FROM lotes
          WHERE id = ${loteId}
          FOR UPDATE
        `)

        if (!loteActual) {
          throw new Error(`El lote con ID ${loteId} no fue encontrado`)
        }

        const estadoAnterior = loteActual.estado

        // 2. Actualizar estado del lote
        const [loteActualizado] = await tx
          .update(lotes)
          .set({ estado: estadoNuevo })
          .where(eq(lotes.id, loteId))
          .returning()

        // 3. Registrar en historial de estados
        const [historial] = await tx
          .insert(historialEstados)
          .values({
            loteId,
            usuarioId,
            estadoAnterior,
            estadoNuevo,
            motivo,
          })
          .returning()

        // 4. Registrar evento de auditoría
        await tx.insert(auditoriaEventos).values({
          usuarioId,
          entidad: 'LOTES',
          entidadId: String(loteId),
          operacion: 'CAMBIO_ESTADO',
          valoresAnteriores: { estado: estadoAnterior },
          valoresNuevos: { estado: estadoNuevo, motivo },
        })

        return {
          lote: loteActualizado,
          historial,
        }
      })
    },

    /**
     * Consulta el historial cronológico de cambios de estado de un lote.
     *
     * @param {number} loteId - ID del lote.
     * @returns {Promise<Array<Object>>} Historial con motivos y usuarios responsables.
     */
    async getHistorialEstados(loteId) {
      return await db
        .select()
        .from(historialEstados)
        .where(eq(historialEstados.loteId, loteId))
        .orderBy(historialEstados.cambiadoEn)
    },
  }
}

module.exports = {
  createIncidenciasEstadosModel,
}
