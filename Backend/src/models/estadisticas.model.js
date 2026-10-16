/**
 * @fileoverview Modelo de datos para consultas parametrizadas sobre las vistas analíticas de Kaotrace.
 */

const { sql } = require('drizzle-orm')

function exclusiveEndDate(date) {
  const exclusive = new Date(date)
  exclusive.setUTCDate(exclusive.getUTCDate() + 1)
  return exclusive.toISOString()
}

/**
 * Factoría que instancia el modelo de estadísticas y consultas analíticas.
 *
 * @param {import('drizzle-orm/postgres-js').PostgresJsDatabase} db - Instancia de Drizzle ORM.
 * @returns {Object} Métodos de consulta sobre las vistas analíticas de PostgreSQL.
 */
function createEstadisticasModel(db) {
  if (!db) {
    throw new Error('La instancia de base de datos es requerida para el modelo de estadísticas')
  }

  return {
    /**
     * Obtiene los registros detallados de merma por productor desde la vista 'analitica_merma_productor'.
     *
     * @param {Object} [filters] - Filtros parametrizados.
     * @param {Date} [filters.fechaDesde] - Fecha mínima de procesamiento.
     * @param {Date} [filters.fechaHasta] - Fecha máxima de procesamiento.
     * @param {string} [filters.municipio] - Municipio del productor.
     * @param {number} [filters.productorId] - ID del productor.
     * @param {boolean} [filters.superaUmbral] - Si supera el umbral estricto del 15%.
     * @param {string} [filters.estadoEvaluacion] - Resultado de evaluabilidad de la merma.
     * @returns {Promise<Array<Object>>}
     */
    async getMermasPorProductor(filters = {}) {
      const conditions = []

      if (filters.fechaDesde) {
        conditions.push(sql`fecha_procesamiento >= ${filters.fechaDesde.toISOString()}`)
      }
      if (filters.fechaHasta) {
        conditions.push(sql`fecha_procesamiento < ${exclusiveEndDate(filters.fechaHasta)}`)
      }
      if (filters.municipio) {
        conditions.push(sql`lower(municipio) = lower(${filters.municipio})`)
      }
      if (filters.productorId) {
        conditions.push(sql`productor_id = ${filters.productorId}`)
      }
      if (typeof filters.superaUmbral === 'boolean') {
        conditions.push(sql`supera_umbral = ${filters.superaUmbral}`)
      }
      if (filters.estadoEvaluacion) {
        conditions.push(sql`estado_evaluacion = ${filters.estadoEvaluacion}`)
      }

      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``

      const rows = await db.execute(sql`
        SELECT
          transformacion_id,
          transformacion_codigo,
          etapa,
          fecha_procesamiento,
          estado_transformacion,
          productor_id,
          productor_nombre,
          municipio,
          entrada_kg,
          salida_kg,
          merma_kg,
          merma_porcentaje,
          umbral_porcentaje,
          estado_evaluacion,
          supera_umbral,
          lotes_involucrados
        FROM analitica_merma_productor
        ${whereClause}
        ORDER BY fecha_procesamiento DESC
      `)

      return rows || []
    },

    /**
     * Obtiene el resumen de costos acumulados por transformación desde 'analitica_costos_por_transformacion'.
     *
     * @param {Object} [filters] - Filtros parametrizados.
     * @param {Date} [filters.fechaDesde] - Fecha mínima.
     * @param {Date} [filters.fechaHasta] - Fecha máxima.
     * @returns {Promise<Array<Object>>}
     */
    async getCostos(filters = {}) {
      const conditions = []

      if (filters.fechaDesde) {
        conditions.push(sql`fecha_procesamiento >= ${filters.fechaDesde.toISOString()}`)
      }
      if (filters.fechaHasta) {
        conditions.push(sql`fecha_procesamiento < ${exclusiveEndDate(filters.fechaHasta)}`)
      }

      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``

      const rows = await db.execute(sql`
        SELECT
          transformacion_id,
          transformacion_codigo,
          fecha_procesamiento,
          estado_transformacion,
          moneda,
          conceptos_costo,
          costo_total
        FROM analitica_costos_por_transformacion
        ${whereClause}
        ORDER BY fecha_procesamiento DESC
      `)

      return rows || []
    },

    async getCostoPromedioPorKg(filters = {}) {
      const mermaConditions = [sql`estado_evaluacion = 'EVALUABLE'`, sql`salida_kg IS NOT NULL`]
      const costoConditions = [sql`moneda = 'COP'`]
      if (filters.fechaDesde) {
        mermaConditions.push(sql`fecha_procesamiento >= ${filters.fechaDesde.toISOString()}`)
        costoConditions.push(sql`fecha_procesamiento >= ${filters.fechaDesde.toISOString()}`)
      }
      if (filters.fechaHasta) {
        const endExclusive = exclusiveEndDate(filters.fechaHasta)
        mermaConditions.push(sql`fecha_procesamiento < ${endExclusive}`)
        costoConditions.push(sql`fecha_procesamiento < ${endExclusive}`)
      }
      const mermaWhere = sql`WHERE ${sql.join(mermaConditions, sql` AND `)}`
      const costoWhere = sql`WHERE ${sql.join(costoConditions, sql` AND `)}`
      const [row] = await db.execute(sql`
        WITH costos AS (
          SELECT transformacion_id, sum(costo_total) AS costo_cop
          FROM analitica_costos_por_transformacion
          ${costoWhere}
          GROUP BY transformacion_id
        ),
        salidas AS (
          SELECT transformacion_id, salida_kg
          FROM analitica_transformacion_merma
          ${mermaWhere}
        )
        SELECT
          coalesce(sum(costos.costo_cop), 0) AS costo_cop,
          coalesce(sum(salidas.salida_kg), 0) AS salida_kg
        FROM costos
        JOIN salidas USING (transformacion_id)
      `)
      const costoCOP = Number(row?.costo_cop || 0)
      const salidaKg = Number(row?.salida_kg || 0)
      return {
        costoCOP,
        salidaAcumuladaKg: salidaKg,
        costoPromedioCOPKg: salidaKg > 0 ? costoCOP / salidaKg : null,
      }
    },

    /**
     * Obtiene el estado actual de inventario por lote desde 'analitica_inventario_lotes'.
     *
     * @param {Object} [filters] - Filtros parametrizados.
     * @param {string} [filters.municipio] - Filtrar por municipio del productor.
     * @returns {Promise<Array<Object>>}
     */
    async getInventario(filters = {}) {
      const conditions = []

      if (filters.municipio) {
        conditions.push(sql`lower(municipio) = lower(${filters.municipio})`)
      }

      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``

      const rows = await db.execute(sql`
        SELECT
          lote_id,
          lote_codigo,
          productor_id,
          productor_nombre,
          municipio,
          unidad_lote,
          cantidad_recibida_kg,
          movimientos_registrados,
          saldo_inventario_kg,
          estado_evaluacion
        FROM analitica_inventario_lotes
        ${whereClause}
        ORDER BY lote_codigo ASC
      `)

      return rows || []
    },

    /**
     * Obtiene la relación de lotes con estados de bloqueo e incidencias desde 'analitica_estado_lotes'.
     *
     * @returns {Promise<Array<Object>>}
     */
    async getEstadoLotes() {
      const rows = await db.execute(sql`
        SELECT
          lote_id,
          lote_codigo,
          productor_id,
          productor_nombre,
          municipio,
          estado_actual,
          bloqueado,
          motivo_estado_actual,
          incidencias_abiertas,
          incidencias_por_estado
        FROM analitica_estado_lotes
        ORDER BY lote_codigo ASC
      `)

      return rows || []
    },

    /**
     * Obtiene el listado de dimensiones de incidencias desde 'analitica_incidencias'.
     *
     * @param {Object} [filters] - Filtros.
     * @param {boolean} [filters.soloAbiertas] - Si es true, retorna solo incidencias abiertas.
     * @returns {Promise<Array<Object>>}
     */
    async getIncidencias(filters = {}) {
      const conditions = []

      if (filters.soloAbiertas) {
        conditions.push(sql`abierta = true`)
      }

      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``

      const rows = await db.execute(sql`
        SELECT
          incidencia_id,
          lote_id,
          lote_codigo,
          productor_id,
          productor_nombre,
          municipio,
          transformacion_id,
          transformacion_codigo,
          tipo,
          severidad,
          estado,
          abierta,
          creada_en
        FROM analitica_incidencias
        ${whereClause}
        ORDER BY creada_en DESC
      `)

      return rows || []
    },

    /**
     * Calcula métricas agregadas globales para el panel de control de Kaotrace.
     *
     * @param {Object} [filters] - Filtros temporales.
     * @returns {Promise<Object>} Resumen con masa total procesada, merma promedio, costos, e incidencias.
     */
    async getResumenGlobal(filters = {}) {
      const mermaConditions = []
      const costoConditions = []
      if (filters.fechaDesde) {
        mermaConditions.push(sql`fecha_procesamiento >= ${filters.fechaDesde.toISOString()}`)
        costoConditions.push(sql`fecha_procesamiento >= ${filters.fechaDesde.toISOString()}`)
      }
      if (filters.fechaHasta) {
        const endExclusive = exclusiveEndDate(filters.fechaHasta)
        mermaConditions.push(sql`fecha_procesamiento < ${endExclusive}`)
        costoConditions.push(sql`fecha_procesamiento < ${endExclusive}`)
      }
      const mermaWhere = mermaConditions.length
        ? sql`WHERE ${sql.join(mermaConditions, sql` AND `)}`
        : sql``
      const costoWhere = costoConditions.length
        ? sql`WHERE ${sql.join(costoConditions, sql` AND `)}`
        : sql``

      const [mermaGlobal] = await db.execute(sql`
        SELECT
          count(*) AS total_transformaciones,
          count(*) FILTER (WHERE estado_evaluacion = 'EVALUABLE') AS transformaciones_evaluables,
          count(*) FILTER (WHERE supera_umbral = true) AS transformaciones_con_alerta,
          coalesce(sum(entrada_kg), 0) AS total_entrada_kg,
          coalesce(sum(salida_kg), 0) AS total_salida_kg,
          coalesce(sum(merma_kg), 0) AS total_merma_kg,
          CASE
            WHEN coalesce(sum(entrada_kg), 0) > 0
            THEN (sum(merma_kg) / sum(entrada_kg)) * 100
            ELSE 0
          END AS merma_global_porcentaje
        FROM analitica_transformacion_merma
        ${mermaWhere}
      `)

      const costosAgrupados = await db.execute(sql`
        SELECT
          moneda,
          sum(costo_total) AS total_costos
        FROM analitica_costos_por_transformacion
        ${costoWhere}
        GROUP BY moneda
      `)

      const [inventarioGlobal] = await db.execute(sql`
        SELECT
          count(*) AS total_lotes,
          coalesce(sum(saldo_inventario_kg), 0) AS saldo_total_kg
        FROM analitica_inventario_lotes
        WHERE estado_evaluacion = 'EVALUABLE'
      `)

      const [incidenciasGlobal] = await db.execute(sql`
        SELECT
          count(*) AS total_incidencias,
          count(*) FILTER (WHERE abierta = true) AS incidencias_abiertas
        FROM analitica_incidencias
      `)

      const [lotesBloqueados] = await db.execute(sql`
        SELECT
          count(*) FILTER (WHERE bloqueado = true) AS lotes_bloqueados
        FROM analitica_estado_lotes
      `)

      return {
        metricasProcesamiento: {
          totalTransformaciones: Number(mermaGlobal?.total_transformaciones || 0),
          transformacionesEvaluables: Number(mermaGlobal?.transformaciones_evaluables || 0),
          transformacionesConAlerta: Number(mermaGlobal?.transformaciones_con_alerta || 0),
          totalEntradaKg: Number(Number(mermaGlobal?.total_entrada_kg || 0).toFixed(2)),
          totalSalidaKg: Number(Number(mermaGlobal?.total_salida_kg || 0).toFixed(2)),
          totalMermaKg: Number(Number(mermaGlobal?.total_merma_kg || 0).toFixed(2)),
          mermaGlobalPorcentaje: Number(Number(mermaGlobal?.merma_global_porcentaje || 0).toFixed(2)),
        },
        costosPorMoneda: costosAgrupados.map((c) => ({
          moneda: c.moneda,
          total: Number(c.total_costos),
        })),
        inventario: {
          totalLotes: Number(inventarioGlobal?.total_lotes || 0),
          saldoTotalKg: Number(Number(inventarioGlobal?.saldo_total_kg || 0).toFixed(2)),
          lotesBloqueados: Number(lotesBloqueados?.lotes_bloqueados || 0),
        },
        incidencias: {
          total: Number(incidenciasGlobal?.total_incidencias || 0),
          abiertas: Number(incidenciasGlobal?.incidencias_abiertas || 0),
        },
      }
    },
  }
}

module.exports = {
  createEstadisticasModel,
}
