/**
 * @fileoverview Modelo de datos para la gestión y consulta de existencias de lotes de cacao.
 */

const { eq, sql } = require('drizzle-orm')
const {
  auditoriaEventos,
  lotes,
  movimientosInventario,
  productores,
  productos,
} = require('../db/schema')
const { httpError } = require('../utils/http-error')

async function lockAndValidateInventory(tx, { consumptions = [], lotIds = [] }) {
  const ids = [...new Set([
    ...lotIds,
    ...consumptions.map((item) => item.loteId),
  ])].sort((left, right) => left - right)
  if (!ids.length) return

  const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `)
  const lockedLots = await tx.execute(sql`
    SELECT id, codigo, estado
    FROM lotes
    WHERE id IN (${idList})
    ORDER BY id
    FOR UPDATE
  `)
  const lockedById = new Map(lockedLots.map((row) => [Number(row.id), row]))

  for (const id of ids) {
    const lote = lockedById.get(id)
    if (!lote) throw httpError(404, `El lote con ID ${id} no existe`)
    if (String(lote.estado).toUpperCase() === 'BLOQUEADO') {
      throw httpError(409, `El lote ${lote.codigo} está bloqueado y no puede recibir movimientos`)
    }
  }

  const quantitiesByLot = new Map()
  for (const item of consumptions) {
    const entries = quantitiesByLot.get(item.loteId) || []
    entries.push(item)
    quantitiesByLot.set(item.loteId, entries)
  }

  for (const [loteId, entries] of quantitiesByLot) {
    const requested = sql.join(
      entries.map(({ cantidad, unidad }) => sql`
        cantidad_a_kg(${String(cantidad)}::numeric, ${unidad})
      `),
      sql` + `,
    )
    const [saldo] = await tx.execute(sql`
      SELECT
        ail.saldo_inventario_kg AS disponible_kg,
        (${requested}) AS requerido_kg,
        ail.saldo_inventario_kg < (${requested}) AS insuficiente
      FROM analitica_inventario_lotes ail
      WHERE ail.lote_id = ${loteId}
      LIMIT 1
    `)

    if (!saldo || saldo.disponible_kg === null || saldo.requerido_kg === null) {
      throw httpError(409, `No se puede comparar el inventario del lote ${lockedById.get(loteId).codigo}`)
    }
    if (saldo.insuficiente) {
      throw httpError(
        409,
        `Saldo insuficiente en el lote ${lockedById.get(loteId).codigo}; disponible: ${saldo.disponible_kg} kg, requerido: ${saldo.requerido_kg} kg`,
      )
    }
  }
}

/**
 * Factoría que instancia el modelo de lotes con la conexión a la base de datos.
 *
 * @param {import('drizzle-orm/postgres-js').PostgresJsDatabase} db - Instancia de Drizzle ORM.
 * @returns {Object} Métodos de acceso a datos para lotes e inventario.
 */
function createLotesModel(db) {
  if (!db) {
    throw new Error('La instancia de base de datos es requerida para el modelo de lotes')
  }

  const formatDate = (value) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)

  return {
    /**
     * Busca un lote por su identificador primario numérico con información de su productor y producto.
     *
     * @param {number} id - Identificador del lote.
     * @returns {Promise<Object|null>} Registro del lote o null si no existe.
     */
    async findById(id) {
      const rows = await db
        .select({
          id: lotes.id,
          codigo: lotes.codigo,
          productorId: lotes.productorId,
          productoId: lotes.productoId,
          fechaRecepcion: lotes.fechaRecepcion,
          cantidadRecibida: lotes.cantidadRecibida,
          unidad: lotes.unidad,
          tipoMaterial: lotes.tipoMaterial,
          estado: lotes.estado,
          creadoEn: lotes.creadoEn,
          productorNombre: productores.nombre,
          productorMunicipio: productores.municipio,
          productoNombre: productos.nombre,
        })
        .from(lotes)
        .leftJoin(productores, eq(productores.id, lotes.productorId))
        .leftJoin(productos, eq(productos.id, lotes.productoId))
        .where(eq(lotes.id, id))
        .limit(1)

      return rows[0] || null
    },

    /**
     * Busca un lote por su código comercial único.
     *
     * @param {string} codigo - Código único del lote (ej. 'CAC001').
     * @returns {Promise<Object|null>} Registro del lote o null si no existe.
     */
    async findByCodigo(codigo) {
      const rows = await db
        .select({
          id: lotes.id,
          codigo: lotes.codigo,
          productorId: lotes.productorId,
          productoId: lotes.productoId,
          fechaRecepcion: lotes.fechaRecepcion,
          cantidadRecibida: lotes.cantidadRecibida,
          unidad: lotes.unidad,
          tipoMaterial: lotes.tipoMaterial,
          estado: lotes.estado,
          creadoEn: lotes.creadoEn,
          productorNombre: productores.nombre,
          productorMunicipio: productores.municipio,
          productoNombre: productos.nombre,
        })
        .from(lotes)
        .leftJoin(productores, eq(productores.id, lotes.productorId))
        .leftJoin(productos, eq(productos.id, lotes.productoId))
        .where(eq(lotes.codigo, codigo))
        .limit(1)

      return rows[0] || null
    },

    /**
     * Consulta el saldo de inventario disponible y estado de evaluación desde la vista analítica.
     *
     * @param {number} loteId - Identificador del lote.
     * @returns {Promise<{ saldoInventarioKg: number|null, estadoEvaluacion: string, bloqueado: boolean }|null>}
     */
    async getSaldoInventario(loteId) {
      const rows = await db.execute(sql`
        SELECT
          ail.lote_id,
          ail.lote_codigo,
          ail.saldo_inventario_kg,
          ail.estado_evaluacion,
          ael.bloqueado,
          ael.estado_actual
        FROM analitica_inventario_lotes ail
        JOIN analitica_estado_lotes ael ON ael.lote_id = ail.lote_id
        WHERE ail.lote_id = ${loteId}
        LIMIT 1
      `)

      if (!rows || rows.length === 0) {
        return null
      }

      const row = rows[0]
      return {
        loteId: Number(row.lote_id),
        codigo: row.lote_codigo,
        saldoInventarioKg: row.saldo_inventario_kg !== null ? Number(row.saldo_inventario_kg) : null,
        estadoEvaluacion: row.estado_evaluacion,
        bloqueado: Boolean(row.bloqueado),
        estadoActual: row.estado_actual,
      }
    },

    async createReception(data) {
      const findByKey = async (claveIdempotencia) => {
        const [existing] = await db.execute(sql`
          SELECT
            l.id AS lote_id,
            l.codigo,
            l.productor_id,
            l.producto_id,
            l.fecha_recepcion,
            l.cantidad_recibida,
            l.unidad,
            l.tipo_material,
            l.estado,
            p.nombre AS productor_nombre,
            p.municipio AS productor_municipio,
            mi.cantidad AS movimiento_cantidad,
            mi.unidad AS movimiento_unidad,
            mi.usuario_id,
            mi.creado_en
          FROM movimientos_inventario mi
          JOIN lotes l ON l.id = mi.lote_id
          JOIN productores p ON p.id = l.productor_id
          WHERE mi.clave_idempotencia = ${claveIdempotencia}
            AND mi.tipo_movimiento = 'ENTRADA'
            AND mi.transformacion_id IS NULL
          LIMIT 1
        `)
        return existing || null
      }

      const toResponse = (row, idempotente) => ({
        id: Number(row.lote_id),
        codigo: row.codigo,
        productorId: Number(row.productor_id),
        productoId: row.producto_id === null ? null : Number(row.producto_id),
        productorNombre: row.productor_nombre,
        productorMunicipio: row.productor_municipio,
        fechaRecepcion: formatDate(row.fecha_recepcion),
        cantidadRecibida: Number(row.cantidad_recibida),
        unidad: row.unidad,
        tipoMaterial: row.tipo_material,
        estado: row.estado,
        movimiento: {
          cantidad: Number(row.movimiento_cantidad),
          unidad: row.movimiento_unidad,
          usuarioId: Number(row.usuario_id),
          creadoEn: row.creado_en,
        },
        idempotente,
      })

      const matchesRequest = (row) =>
        Number(row.productor_id) === data.productorId &&
        row.codigo === data.codigo &&
        (row.producto_id === null ? null : Number(row.producto_id)) === (data.productoId ?? null) &&
        formatDate(row.fecha_recepcion) === data.fechaRecepcion &&
        Number(row.movimiento_cantidad) === data.cantidad &&
        row.movimiento_unidad === data.unidad &&
        (row.tipo_material ?? null) === (data.tipoMaterial ?? null)

      const existing = await findByKey(data.claveIdempotencia)
      if (existing) {
        if (!matchesRequest(existing)) {
          throw httpError(409, 'La clave de idempotencia ya fue usada con otros datos')
        }
        return toResponse(existing, true)
      }

      try {
        const result = await db.transaction(async (tx) => {
          const [producer] = await tx.execute(sql`
            SELECT id
            FROM productores
            WHERE id = ${data.productorId} AND activo = TRUE
            FOR SHARE
          `)
          if (!producer) throw httpError(404, 'Productor activo no encontrado')

          const [lote] = await tx
            .insert(lotes)
            .values({
              codigo: data.codigo,
              productorId: data.productorId,
              productoId: data.productoId,
              fechaRecepcion: data.fechaRecepcion,
              cantidadRecibida: data.cantidad,
              unidad: data.unidad,
              tipoMaterial: data.tipoMaterial,
              estado: 'PENDIENTE',
            })
            .returning()

          const [movimiento] = await tx
            .insert(movimientosInventario)
            .values({
              loteId: lote.id,
              usuarioId: data.usuarioId,
              tipoMovimiento: 'ENTRADA',
              cantidad: data.cantidad,
              unidad: data.unidad,
              claveIdempotencia: data.claveIdempotencia,
            })
            .returning()

          await tx.insert(auditoriaEventos).values({
            usuarioId: data.usuarioId,
            entidad: 'LOTE',
            entidadId: String(lote.id),
            operacion: 'RECEPCION',
            valoresNuevos: {
              codigo: lote.codigo,
              productorId: lote.productorId,
              cantidad: data.cantidad,
              unidad: data.unidad,
              fechaRecepcion: data.fechaRecepcion,
              movimientoId: movimiento.id,
            },
            correlacionId: data.claveIdempotencia,
          })

          const [producerData] = await tx.execute(sql`
            SELECT nombre, municipio FROM productores WHERE id = ${producer.id}
          `)
          return toResponse({
            lote_id: lote.id,
            codigo: lote.codigo,
            productor_id: lote.productorId,
            producto_id: lote.productoId ?? null,
            fecha_recepcion: formatDate(lote.fechaRecepcion),
            cantidad_recibida: lote.cantidadRecibida,
            unidad: lote.unidad,
            tipo_material: lote.tipoMaterial ?? null,
            estado: lote.estado,
            productor_nombre: producerData.nombre,
            productor_municipio: producerData.municipio,
            movimiento_cantidad: movimiento.cantidad,
            movimiento_unidad: movimiento.unidad,
            usuario_id: movimiento.usuarioId,
            creado_en: movimiento.creadoEn,
          }, false)
        })
        return result
      } catch (error) {
        const databaseError = error.cause || error
        if (databaseError.code === '23505') {
          const replay = await findByKey(data.claveIdempotencia)
          if (replay) {
            if (!matchesRequest(replay)) {
              throw httpError(409, 'La clave de idempotencia ya fue usada con otros datos')
            }
            return toResponse(replay, true)
          }
          throw httpError(409, 'Ya existe un lote con ese código')
        }
        throw error
      }
    },

    async listInventory(filters) {
      const conditions = [sql`TRUE`]
      if (filters.productorId) {
        conditions.push(sql`l.productor_id = ${filters.productorId}`)
      }
      if (filters.municipio) {
        conditions.push(sql`p.municipio ILIKE ${filters.municipio}`)
      }
      if (filters.estado) {
        conditions.push(sql`l.estado = ${filters.estado}`)
      }
      if (filters.search) {
        conditions.push(sql`l.codigo ILIKE ${`%${filters.search}%`}`)
      }
      const where = sql.join(conditions, sql` AND `)
      const offset = (filters.page - 1) * filters.limit

      const [countRow] = await db.execute(sql`
        SELECT count(*) AS total
        FROM lotes l
        JOIN productores p ON p.id = l.productor_id
        WHERE ${where}
      `)
      const items = await db.execute(sql`
        SELECT
          l.id,
          l.codigo,
          l.productor_id,
          p.nombre AS productor_nombre,
          p.municipio AS productor_municipio,
          l.producto_id,
          pr.nombre AS producto_nombre,
          l.fecha_recepcion,
          l.cantidad_recibida,
          l.unidad,
          l.tipo_material,
          l.estado,
          ail.saldo_inventario_kg,
          ail.estado_evaluacion,
          ael.bloqueado,
          EXISTS (
            SELECT 1
            FROM transformacion_lotes tl
            WHERE tl.lote_id = l.id AND tl.tipo_participacion = 'SALIDA'
          ) AS creado_por_transformacion,
          COALESCE(salidas.cantidad_salida_kg, 0) AS cantidad_salida_kg
        FROM lotes l
        JOIN productores p ON p.id = l.productor_id
        LEFT JOIN productos pr ON pr.id = l.producto_id
        LEFT JOIN analitica_inventario_lotes ail ON ail.lote_id = l.id
        LEFT JOIN analitica_estado_lotes ael ON ael.lote_id = l.id
        LEFT JOIN LATERAL (
          SELECT sum(cantidad_a_kg(mi.cantidad, mi.unidad)) AS cantidad_salida_kg
          FROM movimientos_inventario mi
          WHERE mi.lote_id = l.id AND mi.tipo_movimiento = 'SALIDA'
        ) salidas ON TRUE
        WHERE ${where}
        ORDER BY l.fecha_recepcion DESC, l.id DESC
        LIMIT ${filters.limit} OFFSET ${offset}
      `)

      return {
        items: items.map((row) => ({
          id: Number(row.id),
          codigo: row.codigo,
          productor: {
            id: Number(row.productor_id),
            nombre: row.productor_nombre,
            municipio: row.productor_municipio,
          },
          producto: row.producto_id === null
            ? null
            : { id: Number(row.producto_id), nombre: row.producto_nombre },
          fechaRecepcion: formatDate(row.fecha_recepcion),
          cantidadRecibida: Number(row.cantidad_recibida),
          unidad: row.unidad,
          tipoMaterial: row.tipo_material,
          estado: row.estado,
          creadoPorTransformacion: Boolean(row.creado_por_transformacion),
          cantidadDisponibleKg: row.saldo_inventario_kg === null
            ? null
            : Number(row.saldo_inventario_kg),
          cantidadSalidaKg: row.cantidad_salida_kg === null
            ? null
            : Number(row.cantidad_salida_kg),
          estadoEvaluacion: row.estado_evaluacion,
          bloqueado: Boolean(row.bloqueado),
        })),
        page: filters.page,
        limit: filters.limit,
        total: Number(countRow.total),
      }
    },

    async listInventoryCsv({ municipio, estado } = {}) {
      const conditions = [sql`TRUE`]
      if (municipio) conditions.push(sql`p.municipio ILIKE ${municipio}`)
      if (estado) conditions.push(sql`l.estado = ${estado}`)
      const where = sql.join(conditions, sql` AND `)
      const rows = await db.execute(sql`
        SELECT
          l.id,
          l.codigo,
          p.municipio AS origen,
          l.cantidad_recibida,
          l.unidad,
          ail.saldo_inventario_kg,
          l.estado,
          coalesce(costs.por_moneda, '[]'::jsonb) AS costos
        FROM lotes l
        JOIN productores p ON p.id = l.productor_id
        LEFT JOIN analitica_inventario_lotes ail ON ail.lote_id = l.id
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object('moneda', totals.moneda, 'total', totals.total)
            ORDER BY totals.moneda
          ) AS por_moneda
          FROM (
            SELECT c.moneda, sum(c.valor) AS total
            FROM (
              SELECT DISTINCT transformacion_id
              FROM transformacion_lotes
              WHERE lote_id = l.id
            ) related
            JOIN costos_transformacion c
              ON c.transformacion_id = related.transformacion_id
            GROUP BY c.moneda
          ) totals
        ) costs ON TRUE
        WHERE ${where}
        ORDER BY l.fecha_recepcion DESC, l.id DESC
      `)

      return rows.map((row) => ({
        id: Number(row.id),
        codigo: row.codigo,
        origen: row.origen,
        cantidadRecibida: Number(row.cantidad_recibida),
        unidad: row.unidad,
        saldoKg: row.saldo_inventario_kg === null
          ? null
          : Number(row.saldo_inventario_kg),
        estado: row.estado,
        costos: row.costos || [],
      }))
    },

    async listMovements(loteId, { page, limit }) {
      const [exists] = await db
        .select({ id: lotes.id })
        .from(lotes)
        .where(eq(lotes.id, loteId))
        .limit(1)
      if (!exists) return null

      const [countRow] = await db.execute(sql`
        SELECT count(*) AS total FROM movimientos_inventario
        WHERE lote_id = ${loteId}
      `)
      const items = await db.execute(sql`
        SELECT
          mi.id,
          mi.tipo_movimiento,
          mi.cantidad,
          mi.unidad,
          mi.transformacion_id,
          mi.usuario_id,
          mi.creado_en
        FROM movimientos_inventario mi
        WHERE mi.lote_id = ${loteId}
        ORDER BY mi.creado_en DESC, mi.id DESC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `)
      return {
        items: items.map((row) => ({
          id: Number(row.id),
          tipo: row.tipo_movimiento,
          cantidad: Number(row.cantidad),
          unidad: row.unidad,
          transformacionId: row.transformacion_id === null
            ? null
            : Number(row.transformacion_id),
          usuarioId: Number(row.usuario_id),
          creadoEn: row.creado_en,
        })),
        page,
        limit,
        total: Number(countRow.total),
      }
    },
  }
}

module.exports = {
  createLotesModel,
  lockAndValidateInventory,
}
