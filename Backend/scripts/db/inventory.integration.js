require('dotenv').config()

const postgres = require('postgres')
const { drizzle } = require('drizzle-orm/postgres-js')
const { randomUUID } = require('node:crypto')
const schema = require('../../src/db/schema')
const { createLotesModel } = require('../../src/models/lotes.model')
const { createProductoresModel } = require('../../src/models/productores.model')
const { createProductosModel } = require('../../src/models/productos.model')
const { createTransformacionesModel } = require('../../src/models/transformaciones.model')
const { createTransformacionesService } = require('../../src/services/transformaciones.service')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL debe estar configurada para probar inventario')
  }

  const client = postgres(process.env.DATABASE_URL, { max: 4 })
  const db = drizzle(client, { schema })
  const lotesModel = createLotesModel(db)
  const productoresModel = createProductoresModel(db)
  const productosModel = createProductosModel(db)
  const transformacionesModel = createTransformacionesModel(db)
  const transformacionesService = createTransformacionesService({
    transformacionesModel,
    lotesModel,
  })
  const suffix = randomUUID()
  const code = `TEST-INV-${suffix}`
  const idempotencyKey = `recepcion:test-${suffix}`
  let producerId
  let productId
  let lotId
  let outputLotId
  const transformationIds = []
  let checks = 0

  try {
    const [admin] = await client`
      SELECT u.id
      FROM usuarios u
      JOIN usuario_roles ur ON ur.usuario_id = u.id
      JOIN roles r ON r.id = ur.rol_id
      WHERE u.activo = TRUE AND r.nombre = 'ADMINISTRADOR'
      ORDER BY u.id
      LIMIT 1
    `
    assert(admin, 'Se necesita el seed de administrador para probar recepción')

    const producer = await productoresModel.create({
      nombre: `Productor de prueba ${suffix}`,
      identificacion: `TEST-${suffix}`,
      municipio: 'Rivera',
      activo: true,
    })
    producerId = producer.id
    checks += 1
    const product = await productosModel.create({
      codigo: `TEST-PROD-${suffix}`,
      nombre: 'Producto de prueba',
      precioReferencia: 25000,
      unidadComercial: 'kg',
    }, Number(admin.id))
    productId = product.id
    checks += 1
    const producerListing = await productoresModel.list({
      page: 1,
      limit: 10,
      search: suffix,
      includeInactive: false,
    })
    assert(producerListing.total === 1 && producerListing.items[0].id === producerId, 'El productor debe poder filtrarse y paginarse')
    checks += 1

    const reception = await lotesModel.createReception({
      productorId: producerId,
      codigo: code,
      cantidad: 100,
      unidad: 'kg',
      fechaRecepcion: '2026-01-01',
      tipoMaterial: 'CACAO',
      claveIdempotencia: idempotencyKey,
      usuarioId: Number(admin.id),
    })
    lotId = reception.id
    assert(reception.idempotente === false, 'La primera recepción debe crear un lote')
    checks += 1

    const replay = await lotesModel.createReception({
      productorId: producerId,
      codigo: code,
      cantidad: 100,
      unidad: 'kg',
      fechaRecepcion: '2026-01-01',
      tipoMaterial: 'CACAO',
      claveIdempotencia: idempotencyKey,
      usuarioId: Number(admin.id),
    })
    assert(replay.id === lotId && replay.idempotente === true, 'El reintento no debe duplicar el lote')
    checks += 1

    let mismatchRejected = false
    try {
      await lotesModel.createReception({
        productorId: producerId,
        codigo: code,
        cantidad: 99,
        unidad: 'kg',
        fechaRecepcion: '2026-01-01',
        tipoMaterial: 'CACAO',
        claveIdempotencia: idempotencyKey,
        usuarioId: Number(admin.id),
      })
    } catch (error) {
      mismatchRejected = error.statusCode === 409
    }
    assert(mismatchRejected, 'Reutilizar una clave de recepción con otro contenido debe dar conflicto')
    checks += 1

    const outputReception = await lotesModel.createReception({
      productorId: producerId,
      codigo: `TEST-OUT-${suffix}`,
      cantidad: 0.001,
      unidad: 'kg',
      productoId: productId,
      fechaRecepcion: '2026-01-01',
      tipoMaterial: 'CACAO PROCESADO',
      claveIdempotencia: `recepcion:output-${suffix}`,
      usuarioId: Number(admin.id),
    })
    outputLotId = outputReception.id
    checks += 1

    const invalidBalance = await lotesModel.getSaldoInventario(lotId)
    let overdrawRejected = false
    try {
      await transformacionesService.createTransformacion({
        codigo: `TEST-OVERDRAW-${suffix}`,
        etapa: 'PRUEBA',
        responsableId: Number(admin.id),
        estado: 'COMPLETADA',
        claveIdempotencia: `test-overdraw-${suffix}`,
        lotesEntrada: [{ loteId: lotId, cantidad: 101, unidad: 'kg' }],
        lotesSalida: [{ loteId: outputLotId, cantidad: 1, unidad: 'kg' }],
      })
    } catch (error) {
      overdrawRejected = error.statusCode === 400
    }
    const balanceAfterRejected = await lotesModel.getSaldoInventario(lotId)
    assert(
      overdrawRejected && balanceAfterRejected.saldoInventarioKg === invalidBalance.saldoInventarioKg,
      'Una transformación rechazada por saldo no debe cambiar el inventario',
    )
    checks += 1

    const transform = (letter) => transformacionesService.createTransformacion({
      codigo: `TEST-TRANS-${letter}-${suffix}`,
      etapa: 'PRUEBA',
      responsableId: Number(admin.id),
      estado: 'COMPLETADA',
      claveIdempotencia: `test-transform-${letter}-${suffix}`,
      lotesEntrada: [{ loteId: lotId, cantidad: 80, unidad: 'kg' }],
      lotesSalida: [{ loteId: outputLotId, cantidad: 80, unidad: 'kg' }],
      costos: [{ concepto: 'Procesamiento', valor: 1600000, moneda: 'COP' }],
    })
    const concurrentResults = await Promise.allSettled([
      transform('A'),
      transform('B'),
    ])
    for (const result of concurrentResults) {
      if (result.status === 'fulfilled') {
        transformationIds.push(result.value.transformacion.id)
      }
    }
    assert(
      concurrentResults.filter((result) => result.status === 'fulfilled').length === 1,
      'Solo una de dos transformaciones concurrentes debe consumir 70 kg de un saldo de 100 kg',
    )
    assert(
      concurrentResults.some((result) => result.status === 'rejected' && result.reason.statusCode === 409),
      'La segunda transformación debe rechazarse por saldo insuficiente',
    )
    const balance = await lotesModel.getSaldoInventario(lotId)
    assert(balance.saldoInventarioKg === 20, 'El saldo final debe ser exactamente 20 kg')
    const outputBalance = await lotesModel.getSaldoInventario(outputLotId)
    assert(outputBalance.saldoInventarioKg === 80.001, 'La salida de transformación debe acreditarse atómicamente')
    checks += 4

    const successfulTransform = concurrentResults.find((result) => result.status === 'fulfilled').value
    const transformId = successfulTransform.transformacion.id
    assert(successfulTransform.idempotente === false, 'La transformación inicial no debe marcarse como reintento')
    checks += 1

    const originalPayload = {
      codigo: successfulTransform.transformacion.codigo,
      etapa: 'PRUEBA',
      responsableId: Number(admin.id),
      estado: 'COMPLETADA',
      claveIdempotencia: successfulTransform.transformacion.claveIdempotencia,
      lotesEntrada: [{ loteId: lotId, cantidad: 80, unidad: 'kg' }],
      lotesSalida: [{ loteId: outputLotId, cantidad: 80, unidad: 'kg' }],
      costos: [{ concepto: 'Procesamiento', valor: 1600000, moneda: 'COP' }],
    }
    const transformReplay = await transformacionesService.createTransformacion(originalPayload)
    assert(transformReplay.idempotente === true && transformReplay.transformacion.id === transformId, 'Reintentar la transformación no debe consumir saldo nuevamente')
    let mismatchedKeyRejected = false
    try {
      await transformacionesService.createTransformacion({
        ...originalPayload,
        lotesEntrada: [{ loteId: lotId, cantidad: 79, unidad: 'kg' }],
      })
    } catch (error) {
      mismatchedKeyRejected = error.statusCode === 409
    }
    assert(mismatchedKeyRejected, 'La clave de idempotencia no debe aceptar otro contenido')
    checks += 2

    await productosModel.addCosto({
      transformacionId: transformId,
      valor: 0,
      moneda: 'COP',
      concepto: 'Ajuste auditado',
      usuarioId: Number(admin.id),
    })
    const margins = await productosModel.calculateMargenes(transformId)
    assert(margins.costosTotal === 1600000, 'El costo de transformación debe coincidir con el valor registrado')
    assert(margins.totalSalidaKg === 80, 'La cantidad vendible debe sumar 80 kg')
    assert(margins.productosDerivados[0].costoUnitario === 20000, 'El costo unitario debe ser 1.600.000 / 80 = 20.000 COP/kg')
    assert(margins.productosDerivados[0].margenPorcentaje === 20, 'El margen sobre venta debe ser 20 % con precio de 25.000 COP/kg')
    const [auditCounts] = await client`
      SELECT
        count(*) FILTER (WHERE entidad = 'TRANSFORMACION')::int AS transformacion,
        count(*) FILTER (WHERE entidad = 'COSTO_TRANSFORMACION')::int AS costo
      FROM auditoria_eventos
      WHERE
        (entidad = 'TRANSFORMACION' AND entidad_id = ${String(transformId)})
        OR (
          entidad = 'COSTO_TRANSFORMACION'
          AND valores_nuevos->>'transformacionId' = ${String(transformId)}
        )
    `
    assert(auditCounts.transformacion === 1 && auditCounts.costo === 1, 'Transformación y costo deben dejar eventos de auditoría')
    checks += 5

    await client`UPDATE productos SET precio_referencia = 0 WHERE id = ${productId}`
    const zeroPriceMargins = await productosModel.calculateMargenes(transformId)
    assert(zeroPriceMargins.productosDerivados[0].margenPorcentaje === null, 'Precio cero no debe dividir por cero ni producir un margen')
    checks += 1

    const listing = await lotesModel.listInventory({
      page: 1,
      limit: 10,
      search: code,
    })
    assert(listing.total === 1 && listing.items[0].cantidadDisponibleKg === 20, 'El inventario debe reflejar entradas y salidas sin duplicar filas')
    checks += 1
    const movementHistory = await lotesModel.listMovements(lotId, { page: 1, limit: 10 })
    assert(
      movementHistory.total === 2 && movementHistory.items.some((movement) => movement.tipo === 'SALIDA'),
      'El historial debe incluir la recepción y el movimiento de salida',
    )
    checks += 1

    const deactivatedProducer = await productoresModel.deactivate(producerId)
    const [retainedLot] = await client`SELECT id FROM lotes WHERE id = ${lotId} AND productor_id = ${producerId}`
    assert(deactivatedProducer.activo === false && retainedLot, 'Desactivar al productor debe conservar su lote histórico')
    checks += 1
    console.log(`Pruebas de inventario PostgreSQL: ${checks} comprobaciones correctas`)
  } finally {
    for (const transformationId of transformationIds) {
      await client`DELETE FROM incidencias WHERE transformacion_id = ${transformationId}`
      await client`DELETE FROM costos_transformacion WHERE transformacion_id = ${transformationId}`
      await client`DELETE FROM auditoria_eventos WHERE entidad_id = ${String(transformationId)}`
      await client`DELETE FROM auditoria_eventos WHERE entidad = 'COSTO_TRANSFORMACION'
        AND valores_nuevos->>'transformacionId' = ${String(transformationId)}`
      await client`DELETE FROM transformacion_lotes WHERE transformacion_id = ${transformationId}`
      await client`DELETE FROM movimientos_inventario WHERE transformacion_id = ${transformationId}`
      await client`DELETE FROM transformaciones WHERE id = ${transformationId}`
    }
    for (const currentLotId of [lotId, outputLotId]) {
      if (!currentLotId) continue
      await client`DELETE FROM movimientos_inventario WHERE lote_id = ${currentLotId}`
      await client`DELETE FROM auditoria_eventos WHERE entidad = 'LOTE' AND entidad_id = ${String(currentLotId)}`
      await client`DELETE FROM lotes WHERE id = ${currentLotId}`
    }
    if (producerId) {
      if (productId) {
        await client`DELETE FROM auditoria_eventos WHERE entidad = 'PRODUCTO' AND entidad_id = ${String(productId)}`
        await client`DELETE FROM productos WHERE id = ${productId}`
      }
      await client`DELETE FROM productores WHERE id = ${producerId}`
    }
    await client.end()
  }
}

main().catch((error) => {
  console.error('Fallaron las pruebas de integración de inventario:', error.message)
  process.exitCode = 1
})
