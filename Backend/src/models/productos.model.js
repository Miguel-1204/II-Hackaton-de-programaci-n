/**
 * @fileoverview Modelo de datos para catálogo comercial de productos, costos y márgenes de ganancia.
 */

const { eq, sql } = require('drizzle-orm')
const { productos, costosTransformacion, transformacionLotes, lotes } = require('../db/schema')

/**
 * Factoría que instancia el modelo de productos, costos y márgenes.
 *
 * @param {import('drizzle-orm/postgres-js').PostgresJsDatabase} db - Instancia de Drizzle ORM.
 * @returns {Object} Métodos de gestión de productos y análisis de márgenes.
 */
function createProductosModel(db) {
  if (!db) {
    throw new Error('La instancia de base de datos es requerida para el modelo de productos')
  }

  return {
    /**
     * Crea un nuevo producto en el catálogo comercial.
     *
     * @param {Object} data - Datos del producto.
     * @param {string} data.codigo - Código único comercial.
     * @param {string} data.nombre - Nombre del producto.
     * @param {string} [data.descripcion] - Descripción comercial.
     * @param {number} [data.precioReferencia] - Precio de referencia sugerido.
     * @param {string} [data.unidadComercial] - Unidad comercial de venta.
     * @returns {Promise<Object>} Registro del producto creado.
     */
    async create(data) {
      const [nuevo] = await db
        .insert(productos)
        .values({
          codigo: data.codigo,
          nombre: data.nombre,
          descripcion: data.descripcion,
          precioReferencia: data.precioReferencia !== undefined ? String(data.precioReferencia) : null,
          unidadComercial: data.unidadComercial,
        })
        .returning()

      return nuevo
    },

    /**
     * Lista todos los productos del catálogo comercial.
     *
     * @returns {Promise<Array<Object>>} Lista de productos.
     */
    async list() {
      return await db.select().from(productos).orderBy(productos.nombre)
    },

    /**
     * Busca un producto por ID.
     *
     * @param {number} id - Identificador del producto.
     * @returns {Promise<Object|null>}
     */
    async findById(id) {
      const rows = await db.select().from(productos).where(eq(productos.id, id)).limit(1)
      return rows[0] || null
    },

    /**
     * Busca un producto por código.
     *
     * @param {string} codigo - Código comercial.
     * @returns {Promise<Object|null>}
     */
    async findByCodigo(codigo) {
      const rows = await db.select().from(productos).where(eq(productos.codigo, codigo)).limit(1)
      return rows[0] || null
    },

    /**
     * Registra un nuevo concepto de costo en una transformación.
     *
     * @param {Object} data - Datos del costo.
     * @param {number} data.transformacionId - ID de la transformación.
     * @param {string} data.concepto - Concepto o rubro de gasto.
     * @param {number} data.valor - Monto numérico.
     * @param {string} data.moneda - Código de moneda.
     * @param {string} [data.observaciones] - Notas del costo.
     * @returns {Promise<Object>} Registro de costo insertado.
     */
    async addCosto(data) {
      const [costo] = await db
        .insert(costosTransformacion)
        .values({
          transformacionId: data.transformacionId,
          concepto: data.concepto,
          valor: data.valor,
          moneda: data.moneda,
          observaciones: data.observaciones,
        })
        .returning()

      return costo
    },

    /**
     * Calcula los costos unitarios y márgenes comerciales de los productos derivados de una transformación.
     *
     * @param {number} transformacionId - ID de la transformación.
     * @returns {Promise<Object>} Resumen de costos, lote de salida, costo unitario y márgenes.
     */
async calculateMargenes(transformacionId) {
      // 1. Obtener totales de costo por moneda desde la vista
      const costosTotal = await db.execute(sql`
        SELECT
          moneda,
          conceptos_costo,
          costo_total
        FROM analitica_costos_por_transformacion
        WHERE transformacion_id = ${transformacionId}
      `)

      // 2. Obtener participaciones de SALIDA usando SQL seguro para evitar errores de sintaxis en ORM
      const salidas = await db.execute(sql`
        SELECT 
          tl.id AS "participacionId",
          tl.lote_id AS "loteId",
          tl.cantidad,
          tl.unidad,
          l.codigo AS "loteCodigo",
          l.producto_id AS "productoId",
          p.codigo AS "productoCodigo",
          p.nombre AS "productoNombre",
          p.precio_referencia AS "precioReferencia",
          p.unidad_comercial AS "unidadComercial"
        FROM transformacion_lotes tl
        JOIN lotes l ON l.id = tl.lote_id
        LEFT JOIN productos p ON p.id = l.producto_id
        WHERE tl.transformacion_id = ${transformacionId} 
          AND tl.tipo_participacion = 'SALIDA'
      `)

      // Total de salida en kg si aplica
      const [mermaRow] = await db.execute(sql`
        SELECT salida_kg FROM analitica_transformacion_merma WHERE transformacion_id = ${transformacionId}
      `)
      const totalSalidaKg = mermaRow?.salida_kg ? Number(mermaRow.salida_kg) : null

      const costoAgrupado = costosTotal.length > 0 ? costosTotal[0] : null
      const costoTotalMonto = costoAgrupado ? Number(costoAgrupado.costo_total) : 0
      const moneda = costoAgrupado ? costoAgrupado.moneda : 'COP'

      const productosDerivados = salidas.map((item) => {
        const cantidadSalida = Number(item.cantidad)
        const precioRef = item.precioReferencia !== null ? Number(item.precioReferencia) : null

        let costoUnitario = null
        if (cantidadSalida > 0 && costoTotalMonto >= 0) {
          costoUnitario = costoTotalMonto / (totalSalidaKg && totalSalidaKg > 0 ? totalSalidaKg : cantidadSalida)
        }

        let margenNeto = null
        let margenPorcentaje = null

        if (costoUnitario !== null && precioRef !== null && precioRef > 0) {
          margenNeto = precioRef - costoUnitario
          margenPorcentaje = (margenNeto / precioRef) * 100
        }

        return {
          loteId: item.loteId,
          loteCodigo: item.loteCodigo,
          productoId: item.productoId,
          productoNombre: item.productoNombre,
          productoCodigo: item.productoCodigo,
          cantidadSalida,
          unidad: item.unidad,
          precioReferencia: precioRef,
          costoUnitario: costoUnitario !== null ? Number(costoUnitario.toFixed(2)) : null,
          margenNeto: margenNeto !== null ? Number(margenNeto.toFixed(2)) : null,
          margenPorcentaje: margenPorcentaje !== null ? Number(margenPorcentaje.toFixed(2)) : null,
          moneda,
        }
      })

      return {
        transformacionId,
        moneda,
        costosTotal: costoTotalMonto,
        conceptosCosto: costoAgrupado ? Number(costoAgrupado.conceptos_costo) : 0,
        totalSalidaKg,
        productosDerivados,
      }
    },
  }
}

module.exports = {
  createProductosModel,
}
