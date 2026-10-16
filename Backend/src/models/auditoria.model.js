const { sql } = require('drizzle-orm')

function createAuditoriaModel(db) {
  if (!db) {
    throw new Error('La instancia de base de datos es requerida para el modelo de auditoría')
  }

  return {
    async listEvents(limit = 500) {
      return await db.execute(sql`
        SELECT
          ae.id,
          ae.entidad,
          ae.entidad_id,
          ae.operacion,
          ae.valores_anteriores,
          ae.valores_nuevos,
          ae.fecha_evento,
          u.nombre AS usuario
        FROM auditoria_eventos ae
        JOIN usuarios u ON u.id = ae.usuario_id
        ORDER BY ae.fecha_evento DESC, ae.id DESC
        LIMIT ${limit}
      `)
    },

    async listRecentMovements(limit = 10) {
      return await db.execute(sql`
        SELECT
          mi.id,
          mi.tipo_movimiento,
          mi.cantidad,
          mi.unidad,
          mi.creado_en,
          l.codigo AS lote,
          t.codigo AS transformacion,
          v.id AS venta_id,
          v.cliente,
          u.nombre AS usuario
        FROM movimientos_inventario mi
        JOIN lotes l ON l.id = mi.lote_id
        LEFT JOIN transformaciones t ON t.id = mi.transformacion_id
        LEFT JOIN ventas v ON v.id = mi.venta_id
        JOIN usuarios u ON u.id = mi.usuario_id
        ORDER BY mi.creado_en DESC, mi.id DESC
        LIMIT ${limit}
      `)
    },
  }
}

module.exports = { createAuditoriaModel }
