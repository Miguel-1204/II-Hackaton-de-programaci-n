/**
 * @fileoverview Modelo de datos para catálogo comercial de productos, costos y márgenes de ganancia.
 */

const { eq, sql } = require('drizzle-orm')
const {
  auditoriaEventos,
  costosTransformacion,
  lotes,
  productos,
  transformacionLotes,
} = require('../db/schema')

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
    async create(data, usuarioId) {
      return db.transaction(async (tx) => {
        const [nuevo] = await tx
          .insert(productos)
          .values({
            codigo: data.codigo,
            nombre: data.nombre,
            descripcion: data.descripcion,
            precioReferencia: data.precioReferencia !== undefined ? String(data.precioReferencia) : null,
            unidadComercial: data.unidadComercial,
          })
          .returning()

        await tx.insert(auditoriaEventos).values({
          usuarioId,
          entidad: 'PRODUCTO',
          entidadId: String(nuevo.id),
          operacion: 'CREACION',
          valoresNuevos: {
            codigo: nuevo.codigo,
            nombre: nuevo.nombre,
            precioReferencia: nuevo.precioReferencia,
            unidadComercial: nuevo.unidadComercial,
          },
        })
        return nuevo
      })
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

    async getFichaPublica(codigo) {
      const [product] = await db
        .select({
          id: productos.id,
          codigo: productos.codigo,
          nombre: productos.nombre,
          descripcion: productos.descripcion,
          unidadComercial: productos.unidadComercial,
        })
        .from(productos)
        .where(eq(productos.codigo, codigo))
        .limit(1)
      if (!product) return null

      const lotesProducto = await db.execute(sql`
        SELECT
          l.id,
          l.codigo,
          l.fecha_recepcion,
          l.cantidad_recibida,
          l.unidad,
          l.estado,
          coalesce(
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'loteEntrada', entrada.codigo,
                'municipioOrigen', origen.municipio,
                'transformacion', t.codigo,
                'etapa', t.etapa,
                'fechaProcesamiento', t.fecha
              )
            ) FILTER (WHERE entrada.id IS NOT NULL),
            '[]'::jsonb
          ) AS trazabilidad
        FROM lotes l
        LEFT JOIN transformacion_lotes salida_tl
          ON salida_tl.lote_id = l.id
          AND salida_tl.tipo_participacion = 'SALIDA'
        LEFT JOIN transformaciones t ON t.id = salida_tl.transformacion_id
        LEFT JOIN transformacion_lotes entrada_tl
          ON entrada_tl.transformacion_id = t.id
          AND entrada_tl.tipo_participacion = 'ENTRADA'
        LEFT JOIN lotes entrada ON entrada.id = entrada_tl.lote_id
        LEFT JOIN productores origen ON origen.id = entrada.productor_id
        WHERE l.producto_id = ${product.id}
        GROUP BY l.id
        ORDER BY l.fecha_recepcion DESC, l.id DESC
      `)
      const statuses = lotesProducto.map((row) => String(row.estado).toUpperCase())
      const estadoComercial = statuses.includes('BLOQUEADO')
        ? 'BLOQUEADO'
        : statuses.length > 0 && statuses.every((state) => ['LIBERADO', 'DISPONIBLE'].includes(state))
          ? 'LIBERADO'
          : 'PENDIENTE'

      return {
        producto: {
          codigo: product.codigo,
          nombre: product.nombre,
          descripcion: product.descripcion,
          unidadComercial: product.unidadComercial,
        },
        estadoComercial,
        disponible: estadoComercial === 'LIBERADO',
        origenes: [...new Set(
          lotesProducto.flatMap((row) =>
            (row.trazabilidad || [])
              .map((entry) => entry.municipioOrigen)
              .filter(Boolean),
          ),
        )].sort(),
        lotes: lotesProducto.map((row) => ({
          codigo: row.codigo,
          fechaRecepcion: row.fecha_recepcion,
          cantidad: Number(row.cantidad_recibida),
          unidad: row.unidad,
          estado: row.estado,
          trazabilidad: row.trazabilidad || [],
        })),
      }
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
      return db.transaction(async (tx) => {
        const [costo] = await tx
          .insert(costosTransformacion)
          .values({
            transformacionId: data.transformacionId,
            concepto: data.concepto,
            valor: data.valor,
            moneda: data.moneda,
            observaciones: data.observaciones,
          })
          .returning()

        await tx.insert(auditoriaEventos).values({
          usuarioId: data.usuarioId,
          entidad: 'COSTO_TRANSFORMACION',
          entidadId: String(costo.id),
          operacion: 'CREACION',
          valoresNuevos: {
            transformacionId: costo.transformacionId,
            concepto: costo.concepto,
            valor: costo.valor,
            moneda: costo.moneda,
          },
        })
        return costo
      })
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

      // 2. Obtener participaciones de SALIDA con datos de lote y producto asociado
      const salidas = await db
        .select({
          participacionId: transformacionLotes.id,
          loteId: transformacionLotes.loteId,
          cantidad: transformacionLotes.cantidad,
          unidad: transformacionLotes.unidad,
          loteCodigo: lotes.codigo,
          productoId: lotes.productoId,
          productoCodigo: productos.codigo,
          productoNombre: productos.nombre,
          precioReferencia: productos.precioReferencia,
          unidadComercial: productos.unidadComercial,
        })
        .from(transformacionLotes)
        .innerJoin(lotes, eq(lotes.id, transformacionLotes.loteId))
        .leftJoin(productos, eq(productos.id, lotes.productoId))
        .where(
          sql`${transformacionLotes.transformacionId} = ${transformacionId} AND ${transformacionLotes.tipoParticipacion} = 'SALIDA'`,
        )

      // Total de salida en kg si aplica
      const [mermaRow] = await db.execute(sql`
        SELECT salida_kg FROM analitica_transformacion_merma WHERE transformacion_id = ${transformacionId}
      `)
      const totalSalidaKg =
        mermaRow?.salida_kg === null || mermaRow?.salida_kg === undefined
          ? null
          : Number(mermaRow.salida_kg)
      const costosPorMoneda = costosTotal.map((row) => ({
        moneda: row.moneda,
        conceptosCosto: Number(row.conceptos_costo),
        costoTotal: Number(row.costo_total),
      }))
      const costoCOP = costosPorMoneda.find((row) => row.moneda === 'COP')
      const moneda = costosPorMoneda.length === 1 ? costosPorMoneda[0].moneda : null
      const isPricePerKg = (unidad) =>
        typeof unidad === 'string' &&
        ['kg', 'kilogramo', 'kilogramos', 'cop/kg', 'cop por kg'].includes(
          unidad.trim().toLowerCase(),
        )

      const productosDerivados = salidas.map((item) => {
        const cantidadSalida = Number(item.cantidad)
        const precioRef = item.precioReferencia !== null ? Number(item.precioReferencia) : null

        const costoUnitario =
          costoCOP && totalSalidaKg > 0 ? costoCOP.costoTotal / totalSalidaKg : null

        let margenNeto = null
        let margenPorcentaje = null

        if (
          costoUnitario !== null &&
          precioRef !== null &&
          precioRef > 0 &&
          isPricePerKg(item.unidadComercial)
        ) {
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
          costoUnitarioUnidad: costoUnitario === null ? null : 'COP/kg',
        }
      })

      return {
        transformacionId,
        moneda,
        costosTotal: costoCOP ? costoCOP.costoTotal : null,
        conceptosCosto: costosPorMoneda.reduce((sum, row) => sum + row.conceptosCosto, 0),
        costosPorMoneda,
        totalSalidaKg,
        productosDerivados,
      }
    },
  }
}

module.exports = {
  createProductosModel,
}
