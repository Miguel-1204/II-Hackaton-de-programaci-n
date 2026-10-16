/**
 * @fileoverview Validador de parámetros de consulta para los servicios estadísticos y reportes.
 */

/**
 * Valida y normaliza los filtros de consulta para las vistas analíticas.
 *
 * @param {Record<string, unknown>} query - Parámetros de la URL (req.query).
 * @returns {{ value: {
 *   fechaDesde?: Date,
 *   fechaHasta?: Date,
 *   municipio?: string,
 *   productorId?: number,
 *   superaUmbral?: boolean,
 *   etapa?: string,
 *   estado?: string
 * }, error?: string }}
 */
function validateEstadisticasQuery(query = {}) {
  const result = {}

  if (query.fechaDesde) {
    const d = new Date(String(query.fechaDesde))
    if (isNaN(d.getTime())) {
      return { error: 'El parámetro "fechaDesde" debe ser una fecha válida (formato YYYY-MM-DD)' }
    }
    result.fechaDesde = d
  }

  if (query.fechaHasta) {
    const d = new Date(String(query.fechaHasta))
    if (isNaN(d.getTime())) {
      return { error: 'El parámetro "fechaHasta" debe ser una fecha válida (formato YYYY-MM-DD)' }
    }
    result.fechaHasta = d
  }

  if (result.fechaDesde && result.fechaHasta && result.fechaDesde > result.fechaHasta) {
    return { error: '"fechaDesde" no puede ser posterior a "fechaHasta"' }
  }

  if (typeof query.municipio === 'string' && query.municipio.trim()) {
    result.municipio = query.municipio.trim()
  }

  if (query.productorId !== undefined) {
    const pId = Number(query.productorId)
    if (!Number.isSafeInteger(pId) || pId <= 0) {
      return { error: '"productorId" debe ser un número entero positivo' }
    }
    result.productorId = pId
  }

  if (query.superaUmbral !== undefined) {
    const str = String(query.superaUmbral).toLowerCase()
    if (str === 'true' || str === '1') {
      result.superaUmbral = true
    } else if (str === 'false' || str === '0') {
      result.superaUmbral = false
    }
  }

  if (typeof query.etapa === 'string' && query.etapa.trim()) {
    result.etapa = query.etapa.trim().toUpperCase()
  }

  if (typeof query.estado === 'string' && query.estado.trim()) {
    result.estado = query.estado.trim().toUpperCase()
  }

  return { value: result }
}

module.exports = {
  validateEstadisticasQuery,
}
