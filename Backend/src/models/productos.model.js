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

    async listPublic() {
      const rows = await db.execute(sql`
        SELECT
          p.id,
          p.codigo,
          p.nombre,
          p.descripcion,
          p.imagen_url,
          p.precio_referencia,
          p.unidad_comercial,
          CASE
            WHEN count(l.id) = 0 THEN 'PENDIENTE'
            WHEN coalesce(sum(ail.saldo_inventario_kg) FILTER (
              WHERE l.estado IN ('PENDIENTE', 'LIBERADO') AND ail.saldo_inventario_kg > 0
            ), 0) > 0 THEN 'LIBERADO'
            WHEN count(l.id) FILTER (WHERE l.estado = 'BLOQUEADO') > 0 THEN 'BLOQUEADO'
            ELSE 'PENDIENTE'
          END AS estado_comercial,
          coalesce(sum(ail.saldo_inventario_kg) FILTER (
            WHERE l.estado IN ('PENDIENTE', 'LIBERADO') AND ail.saldo_inventario_kg > 0
          ), 0) AS stock_disponible_kg,
          coalesce(array_agg(DISTINCT productor.municipio) FILTER (WHERE productor.municipio IS NOT NULL), ARRAY[]::varchar[]) AS origenes
        FROM productos p
        LEFT JOIN lotes l ON l.producto_id = p.id
        LEFT JOIN productores productor ON productor.id = l.productor_id
        LEFT JOIN analitica_inventario_lotes ail ON ail.lote_id = l.id
        GROUP BY p.id
        ORDER BY p.nombre
      `)
      return rows.map((row) => {
        const stockDisponibleKg = Number(row.stock_disponible_kg || 0)
        return {
          producto: {
            id: Number(row.id),
            codigo: row.codigo,
            nombre: row.nombre,
            descripcion: row.descripcion,
            imagenUrl: row.imagen_url,
            precioReferencia: row.precio_referencia === null ? null : Number(row.precio_referencia),
            unidadComercial: row.unidad_comercial,
          },
          estadoComercial: row.estado_comercial,
          disponible: stockDisponibleKg > 0,
          stockDisponibleKg,
          origenes: row.origenes || [],
        }
      })
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
          imagenUrl: productos.imagenUrl,
          precioReferencia: productos.precioReferencia,
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
          l.tipo_material,
          l.estado,
          ail.saldo_inventario_kg,
          lote_productor.nombre AS productor_lote,
          lote_productor.municipio AS municipio_lote,
          t.id AS transformacion_id,
          t.codigo AS transformacion_codigo,
          t.etapa,
          t.fecha AS fecha_procesamiento,
          salida_tl.cantidad AS cantidad_salida,
          salida_tl.unidad AS unidad_salida,
          entrada.codigo AS lote_entrada,
          entrada_tl.cantidad AS cantidad_entrada,
          entrada_tl.unidad AS unidad_entrada,
          origen.nombre AS productor_origen,
          origen.municipio AS municipio_origen,
          atm.entrada_kg,
          atm.salida_kg,
          atm.merma_kg,
          atm.merma_porcentaje,
          coalesce((
            SELECT jsonb_agg(jsonb_build_object(
              'tipo', i.tipo,
              'severidad', i.severidad,
              'estado', i.estado,
              'descripcion', i.descripcion
            ) ORDER BY i.creada_en)
            FROM incidencias i
            WHERE i.transformacion_id = t.id
          ), '[]'::jsonb) AS incidencias
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
        LEFT JOIN productores lote_productor ON lote_productor.id = l.productor_id
        LEFT JOIN analitica_inventario_lotes ail ON ail.lote_id = l.id
        LEFT JOIN analitica_transformacion_merma atm ON atm.transformacion_id = t.id
        WHERE l.producto_id = ${product.id}
        ORDER BY l.fecha_recepcion DESC, l.id DESC
      `)
      const lotesMap = new Map()
      for (const row of lotesProducto) {
        const loteId = Number(row.id)
        if (!lotesMap.has(loteId)) {
          lotesMap.set(loteId, {
            id: loteId,
            codigo: row.codigo,
            fechaRecepcion: row.fecha_recepcion,
            cantidad: Number(row.cantidad_recibida),
            unidad: row.unidad,
            tipoMaterial: row.tipo_material,
            estado: row.estado,
            disponibleKg: row.saldo_inventario_kg === null ? null : Number(row.saldo_inventario_kg),
            productor: row.productor_lote,
            municipio: row.municipio_lote,
            trazabilidad: [],
          })
        }
        if (row.transformacion_id && row.lote_entrada) {
          const lote = lotesMap.get(loteId)
          const key = `${row.transformacion_id}:${row.lote_entrada}`
          if (!lote.trazabilidad.some((entry) => entry.clave === key)) {
            lote.trazabilidad.push({
              clave: key,
              loteEntrada: row.lote_entrada,
              productor: row.productor_origen,
              municipioOrigen: row.municipio_origen,
              transformacion: row.transformacion_codigo,
              etapa: row.etapa,
              fechaProcesamiento: row.fecha_procesamiento,
              cantidadEntrada: Number(row.cantidad_entrada),
              unidadEntrada: row.unidad_entrada,
              cantidadSalida: Number(row.cantidad_salida),
              unidadSalida: row.unidad_salida,
              entradaKg: row.entrada_kg === null ? null : Number(row.entrada_kg),
              salidaKg: row.salida_kg === null ? null : Number(row.salida_kg),
              mermaKg: row.merma_kg === null ? null : Number(row.merma_kg),
              mermaPorcentaje: row.merma_porcentaje === null ? null : Number(row.merma_porcentaje),
              incidencias: row.incidencias || [],
            })
          }
        }
      }
      const lotes = [...lotesMap.values()]
      const statuses = lotes.map((row) => String(row.estado).toUpperCase())
      const disponibles = lotes.filter((lote) =>
        ['PENDIENTE', 'LIBERADO'].includes(String(lote.estado).toUpperCase()) && Number(lote.disponibleKg) > 0,
      )
      const stockDisponibleKg = disponibles.reduce((sum, lote) => sum + Math.max(0, Number(lote.disponibleKg || 0)), 0)
      const estadoComercial = stockDisponibleKg > 0
        ? 'LIBERADO'
        : statuses.includes('BLOQUEADO')
          ? 'BLOQUEADO'
          : 'PENDIENTE'

      return {
        producto: {
          id: product.id,
          codigo: product.codigo,
          nombre: product.nombre,
          descripcion: product.descripcion,
          imagenUrl: product.imagenUrl,
          precioReferencia: product.precioReferencia === null ? null : Number(product.precioReferencia),
          unidadComercial: product.unidadComercial,
        },
        estadoComercial,
        disponible: stockDisponibleKg > 0,
        stockDisponibleKg,
        origenes: [...new Set(
          lotes.flatMap((row) =>
            [row.municipio, ...(row.trazabilidad || []).map((entry) => entry.municipioOrigen)].filter(Boolean),
          ),
        )].sort(),
        lotes,
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
