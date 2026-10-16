const { sql } = require('drizzle-orm')
const { auditoriaEventos, movimientosInventario, ventas } = require('../db/schema')
const { lockAndValidateInventory } = require('./lotes.model')
const { httpError } = require('../utils/http-error')

function createVentasModel(db) {
  if (!db) {
    throw new Error('La instancia de base de datos es requerida para el modelo de ventas')
  }

  const selectVenta = async (query, claveIdempotencia) => {
    const [row] = await query.execute(sql`
      SELECT
        v.id,
        v.lote_id,
        l.codigo AS lote_codigo,
        p.nombre AS producto,
        pr.municipio,
        v.usuario_id,
        u.nombre AS usuario,
        v.cliente,
        v.cantidad_kg,
        v.precio_unitario_cop,
        v.total_cop,
        v.fecha_venta,
        v.clave_idempotencia
      FROM ventas v
      JOIN lotes l ON l.id = v.lote_id
      LEFT JOIN productos p ON p.id = l.producto_id
      JOIN productores pr ON pr.id = l.productor_id
      JOIN usuarios u ON u.id = v.usuario_id
      WHERE v.clave_idempotencia = ${claveIdempotencia}
      LIMIT 1
    `)
    return row || null
  }

  const formatVenta = (row, idempotente = false) => ({
    id: Number(row.id),
    loteId: Number(row.lote_id),
    loteCodigo: row.lote_codigo,
    producto: row.producto,
    municipio: row.municipio,
    usuarioId: Number(row.usuario_id),
    usuario: row.usuario,
    cliente: row.cliente,
    cantidadKg: Number(row.cantidad_kg),
    precioUnitarioCop: Number(row.precio_unitario_cop),
    totalCop: Number(row.total_cop),
    fechaVenta: row.fecha_venta,
    idempotente,
  })

  const matchesRequest = (row, data) =>
    Number(row.usuario_id) === data.usuarioId &&
    Number(row.lote_id) === data.loteId &&
    Number(row.cantidad_kg) === data.cantidadKg &&
    Number(row.precio_unitario_cop) === data.precioUnitarioCop &&
    (row.cliente || null) === (data.cliente || null)

  return {
    async create(data) {
      const existing = await selectVenta(db, data.claveIdempotencia)
      if (existing) {
        if (!matchesRequest(existing, data)) {
          throw httpError(409, 'La clave de idempotencia ya fue usada con otros datos')
        }
        return formatVenta(existing, true)
      }

      let idempotente = false
      try {
        await db.transaction(async (tx) => {
          await tx.execute(sql`
            SELECT pg_advisory_xact_lock(hashtextextended(${data.claveIdempotencia}, 0))
          `)
          const replay = await selectVenta(tx, data.claveIdempotencia)
          if (replay) {
            if (!matchesRequest(replay, data)) {
              throw httpError(409, 'La clave de idempotencia ya fue usada con otros datos')
            }
            idempotente = true
            return
          }

          await lockAndValidateInventory(tx, {
            consumptions: [{ loteId: data.loteId, cantidad: data.cantidadKg, unidad: 'kg' }],
          })

          const [sale] = await tx
            .insert(ventas)
            .values({
              loteId: data.loteId,
              usuarioId: data.usuarioId,
              cliente: data.cliente || null,
              cantidadKg: data.cantidadKg,
              precioUnitarioCop: data.precioUnitarioCop,
              totalCop: sql`round(${String(data.cantidadKg)}::numeric * ${String(data.precioUnitarioCop)}::numeric, 2)`,
              claveIdempotencia: data.claveIdempotencia,
            })
            .returning()

          await tx.insert(movimientosInventario).values({
            loteId: data.loteId,
            ventaId: sale.id,
            usuarioId: data.usuarioId,
            tipoMovimiento: 'SALIDA',
            cantidad: data.cantidadKg,
            unidad: 'kg',
            claveIdempotencia: `${data.claveIdempotencia}_salida`,
          })

          await tx.insert(auditoriaEventos).values({
            usuarioId: data.usuarioId,
            entidad: 'VENTA',
            entidadId: String(sale.id),
            operacion: 'CREACION',
            valoresNuevos: {
              loteId: data.loteId,
              cantidadKg: data.cantidadKg,
              precioUnitarioCop: data.precioUnitarioCop,
              totalCop: Number(sale.totalCop),
              cliente: data.cliente || null,
            },
            correlacionId: data.claveIdempotencia,
          })
        })

        const row = await selectVenta(db, data.claveIdempotencia)
        if (!row) throw new Error('La venta se guardó, pero no fue posible recuperarla')
        return formatVenta(row, idempotente)
      } catch (error) {
        const databaseError = error.cause || error
        if (databaseError.code === '23505') {
          const replay = await selectVenta(db, data.claveIdempotencia)
          if (replay) {
            if (!matchesRequest(replay, data)) {
              throw httpError(409, 'La clave de idempotencia ya fue usada con otros datos')
            }
            return formatVenta(replay, true)
          }
          throw error
        }
        throw error
      }
    },

    async list({ fechaDesde, fechaHasta, municipio, limit = 100 } = {}) {
      const filters = []
      if (fechaDesde) filters.push(sql`v.fecha_venta >= ${fechaDesde.toISOString()}`)
      if (fechaHasta) {
        const exclusive = new Date(fechaHasta)
        exclusive.setUTCDate(exclusive.getUTCDate() + 1)
        filters.push(sql`v.fecha_venta < ${exclusive.toISOString()}`)
      }
      if (municipio) filters.push(sql`lower(pr.municipio) = lower(${municipio})`)
      const where = filters.length ? sql`WHERE ${sql.join(filters, sql` AND `)}` : sql``
      const rows = await db.execute(sql`
        SELECT
          v.id,
          v.lote_id,
          l.codigo AS lote_codigo,
          p.nombre AS producto,
          pr.municipio,
          v.usuario_id,
          u.nombre AS usuario,
          v.cliente,
          v.cantidad_kg,
          v.precio_unitario_cop,
          v.total_cop,
          v.fecha_venta,
          v.clave_idempotencia
        FROM ventas v
        JOIN lotes l ON l.id = v.lote_id
        LEFT JOIN productos p ON p.id = l.producto_id
        JOIN productores pr ON pr.id = l.productor_id
        JOIN usuarios u ON u.id = v.usuario_id
        ${where}
        ORDER BY v.fecha_venta DESC, v.id DESC
        LIMIT ${limit}
      `)
      return rows.map((row) => formatVenta(row))
    },
  }
}

module.exports = { createVentasModel }
