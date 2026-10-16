/**
 * @fileoverview Modelo de datos para la gestión y consulta de existencias de lotes de cacao.
 */

const { eq, sql } = require('drizzle-orm')
const { lotes, productores, productos } = require('../db/schema')

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
  }
}

module.exports = {
  createLotesModel,
}
