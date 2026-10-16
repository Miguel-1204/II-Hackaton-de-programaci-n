/**
 * @fileoverview Modelo de datos para la reconstrucción del árbol de trazabilidad del cacao (aguas arriba y aguas abajo).
 */

const { eq, sql } = require('drizzle-orm')
const {
  lotes,
  productores,
  productos,
  transformaciones,
  transformacionLotes,
  incidencias,
  historialEstados,
} = require('../db/schema')

/**
 * Factoría que instancia el modelo de trazabilidad agroindustrial.
 *
 * @param {import('drizzle-orm/postgres-js').PostgresJsDatabase} db - Instancia de Drizzle ORM.
 * @returns {Object} Métodos de trazabilidad y reconstrucción de la cadena de valor.
 */
function createTrazabilidadModel(db) {
  if (!db) {
    throw new Error('La instancia de base de datos es requerida para el modelo de trazabilidad')
  }

  return {
    /**
     * Reconstruye la trazabilidad completa (aguas arriba y aguas abajo) de un lote de cacao dado su código.
     *
     * @param {string} codigoLote - Código comercial del lote (ej. 'CAC001').
     * @returns {Promise<Object|null>} Árbol de trazabilidad con productores de origen, transformaciones y derivados.
     */
    async getTrazabilidadCompleta(codigoLote) {
      // 1. Obtener lote principal
      const [lote] = await db
        .select({
          id: lotes.id,
          codigo: lotes.codigo,
          fechaRecepcion: lotes.fechaRecepcion,
          cantidadRecibida: lotes.cantidadRecibida,
          unidad: lotes.unidad,
          tipoMaterial: lotes.tipoMaterial,
          estado: lotes.estado,
          creadoEn: lotes.creadoEn,
          productorId: productores.id,
          productorNombre: productores.nombre,
          productorIdentificacion: productores.identificacion,
          productorMunicipio: productores.municipio,
          productoId: productos.id,
          productoCodigo: productos.codigo,
          productoNombre: productos.nombre,
        })
        .from(lotes)
        .leftJoin(productores, eq(productores.id, lotes.productorId))
        .leftJoin(productos, eq(productos.id, lotes.productoId))
        .where(eq(lotes.codigo, codigoLote))
        .limit(1)

      if (!lote) return null

      // 2. Trazabilidad aguas arriba (Upstream): ¿De qué transformaciones nació este lote como SALIDA?
      const transformacionesOrigen = await db.execute(sql`
        SELECT
          t.id AS transformacion_id,
          t.codigo AS transformacion_codigo,
          t.etapa,
          t.fecha,
          t.estado,
          tl_salida.cantidad AS cantidad_producida,
          tl_salida.unidad AS unidad_producida,
          atm.merma_porcentaje,
          atm.supera_umbral
        FROM transformacion_lotes tl_salida
        JOIN transformaciones t ON t.id = tl_salida.transformacion_id
        LEFT JOIN analitica_transformacion_merma atm ON atm.transformacion_id = t.id
        WHERE tl_salida.lote_id = ${lote.id}
          AND tl_salida.tipo_participacion = 'SALIDA'
      `)

      const upstreamIds = transformacionesOrigen.map((t) => Number(t.transformacion_id))
      const upstreamFilter = sql.join(upstreamIds.map((id) => sql`${id}`), sql`, `)

      const entradasOrigen = upstreamIds.length
        ? await db.execute(sql`
          SELECT
            tl.transformacion_id,
            l.id AS lote_id,
            l.codigo AS lote_codigo,
            l.cantidad_recibida,
            l.unidad AS lote_unidad,
            tl.cantidad AS cantidad_utilizada,
            tl.unidad AS unidad_utilizada,
            p.id AS productor_id,
            p.nombre AS productor_nombre,
            p.identificacion AS productor_identificacion,
            p.municipio AS productor_municipio
          FROM transformacion_lotes tl
          JOIN lotes l ON l.id = tl.lote_id
          JOIN productores p ON p.id = l.productor_id
          WHERE tl.transformacion_id IN (${upstreamFilter})
            AND tl.tipo_participacion = 'ENTRADA'
        `)
        : []
      const entradasPorTransformacion = new Map()
      for (const entrada of entradasOrigen) {
        const rows = entradasPorTransformacion.get(Number(entrada.transformacion_id)) || []
        rows.push(entrada)
        entradasPorTransformacion.set(Number(entrada.transformacion_id), rows)
      }
      const materiasPrimasOrigen = transformacionesOrigen.map((transformation) => ({
        transformacion: transformation,
        lotesEntrada: entradasPorTransformacion.get(Number(transformation.transformacion_id)) || [],
      }))

      // 3. Trazabilidad aguas abajo (Downstream): ¿En qué transformaciones participó este lote como ENTRADA?
      const transformacionesDestino = await db.execute(sql`
        SELECT
          t.id AS transformacion_id,
          t.codigo AS transformacion_codigo,
          t.etapa,
          t.fecha,
          t.estado,
          tl_entrada.cantidad AS cantidad_consumida,
          tl_entrada.unidad AS unidad_consumida,
          atm.merma_porcentaje,
          atm.supera_umbral
        FROM transformacion_lotes tl_entrada
        JOIN transformaciones t ON t.id = tl_entrada.transformacion_id
        LEFT JOIN analitica_transformacion_merma atm ON atm.transformacion_id = t.id
        WHERE tl_entrada.lote_id = ${lote.id}
          AND tl_entrada.tipo_participacion = 'ENTRADA'
      `)

      const downstreamIds = transformacionesDestino.map((t) => Number(t.transformacion_id))
      const downstreamFilter = sql.join(downstreamIds.map((id) => sql`${id}`), sql`, `)
      const salidasDestino = downstreamIds.length
        ? await db.execute(sql`
          SELECT
            tl.transformacion_id,
            l.id AS lote_id,
            l.codigo AS lote_codigo,
            l.cantidad_recibida,
            l.unidad AS lote_unidad,
            tl.cantidad AS cantidad_obtenida,
            tl.unidad AS unidad_obtenida,
            pr.id AS producto_id,
            pr.nombre AS producto_nombre,
            pr.codigo AS producto_codigo
          FROM transformacion_lotes tl
          JOIN lotes l ON l.id = tl.lote_id
          LEFT JOIN productos pr ON pr.id = l.producto_id
          WHERE tl.transformacion_id IN (${downstreamFilter})
            AND tl.tipo_participacion = 'SALIDA'
        `)
        : []
      const salidasPorTransformacion = new Map()
      for (const salida of salidasDestino) {
        const rows = salidasPorTransformacion.get(Number(salida.transformacion_id)) || []
        rows.push(salida)
        salidasPorTransformacion.set(Number(salida.transformacion_id), rows)
      }
      const productosDerivados = transformacionesDestino.map((transformation) => ({
        transformacion: transformation,
        lotesSalida: salidasPorTransformacion.get(Number(transformation.transformacion_id)) || [],
      }))

      // 4. Incidencias registradas en el lote
      const incidenciasLote = await db
        .select()
        .from(incidencias)
        .where(eq(incidencias.loteId, lote.id))
        .orderBy(incidencias.creadaEn)

      // 5. Historial de estados del lote
      const historialLote = await db
        .select()
        .from(historialEstados)
        .where(eq(historialEstados.loteId, lote.id))
        .orderBy(historialEstados.cambiadoEn)

      return {
        lote: {
          id: lote.id,
          codigo: lote.codigo,
          fechaRecepcion: lote.fechaRecepcion,
          cantidadRecibida: lote.cantidadRecibida,
          unidad: lote.unidad,
          tipoMaterial: lote.tipoMaterial,
          estado: lote.estado,
          creadoEn: lote.creadoEn,
        },
        productor: {
          id: lote.productorId,
          nombre: lote.productorNombre,
          identificacion: lote.productorIdentificacion,
          municipio: lote.productorMunicipio,
        },
        productoComercial: lote.productoId
          ? {
              id: lote.productoId,
              codigo: lote.productoCodigo,
              nombre: lote.productoNombre,
            }
          : null,
        aguasArriba: materiasPrimasOrigen,
        aguasAbajo: productosDerivados,
        incidencias: incidenciasLote,
        historialEstados: historialLote,
      }
    },
  }
}

module.exports = {
  createTrazabilidadModel,
}
