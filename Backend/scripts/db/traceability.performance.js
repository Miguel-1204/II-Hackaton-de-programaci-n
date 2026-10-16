require('dotenv').config()

const postgres = require('postgres')
const { drizzle } = require('drizzle-orm/postgres-js')
const request = require('supertest')
const schema = require('../../src/db/schema')
const { createTrazabilidadModel } = require('../../src/models/trazabilidad.model')
const { createApp } = require('../../src/app')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL debe estar configurada para probar trazabilidad')
  }
  const client = postgres(process.env.DATABASE_URL, { max: 10 })
  const db = drizzle(client, { schema })
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const producerCode = `TRACE-${suffix}`
  const productCode = `TRACE-PROD-${suffix}`
  const rootCode = `TRACE-ROOT-${suffix}`
  let fixturesCreated = false

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
    assert(admin, 'Ejecuta los seeds de roles y administrador antes de la prueba')

    await client.begin(async (tx) => {
      const [producer] = await tx`
        INSERT INTO productores (nombre, identificacion, municipio)
        VALUES (${`Productor de prueba ${suffix}`}, ${producerCode}, 'La Plata, Huila')
        RETURNING id
      `
      const [product] = await tx`
        INSERT INTO productos (codigo, nombre, precio_referencia, unidad_comercial)
        VALUES (${productCode}, 'Producto sintético de trazabilidad', 25000, 'kg')
        RETURNING id
      `
      const [root] = await tx`
        INSERT INTO lotes
          (codigo, productor_id, fecha_recepcion, cantidad_recibida, unidad, estado)
        VALUES (${rootCode}, ${producer.id}, CURRENT_DATE, 1000, 'kg', 'RECIBIDO')
        RETURNING id
      `
      await tx`
        INSERT INTO movimientos_inventario
          (lote_id, usuario_id, tipo_movimiento, cantidad, unidad, clave_idempotencia)
        VALUES (${root.id}, ${admin.id}, 'ENTRADA', 1000, 'kg', ${`trace-root-${suffix}`})
      `

      for (let index = 0; index < 100; index += 1) {
        const transformationCode = `TRACE-TRANS-${suffix}-${index}`
        const outputCode = `TRACE-OUT-${suffix}-${index}`
        const [transformation] = await tx`
          INSERT INTO transformaciones (codigo, etapa, responsable_id, estado)
          VALUES (${transformationCode}, 'SECADO', ${admin.id}, 'COMPLETADA')
          RETURNING id
        `
        const [output] = await tx`
          INSERT INTO lotes
            (codigo, productor_id, producto_id, fecha_recepcion, cantidad_recibida, unidad, estado)
          VALUES (${outputCode}, ${producer.id}, ${product.id}, CURRENT_DATE, 0.8, 'kg', 'LIBERADO')
          RETURNING id
        `
        await tx`
          INSERT INTO transformacion_lotes
            (transformacion_id, lote_id, tipo_participacion, cantidad, unidad)
          VALUES
            (${transformation.id}, ${root.id}, 'ENTRADA', 1, 'kg'),
            (${transformation.id}, ${output.id}, 'SALIDA', 0.8, 'kg')
        `
        await tx`
          INSERT INTO movimientos_inventario
            (lote_id, transformacion_id, usuario_id, tipo_movimiento, cantidad, unidad, clave_idempotencia)
          VALUES
            (${root.id}, ${transformation.id}, ${admin.id}, 'SALIDA', 1, 'kg', ${`trace-in-${suffix}-${index}`}),
            (${output.id}, ${transformation.id}, ${admin.id}, 'ENTRADA', 0.8, 'kg', ${`trace-out-${suffix}-${index}`})
        `
        await tx`
          INSERT INTO costos_transformacion (transformacion_id, concepto, valor, moneda)
          VALUES (${transformation.id}, 'Costo de prueba', 12345.67, 'COP')
        `
        await tx`
          INSERT INTO auditoria_eventos
            (usuario_id, entidad, entidad_id, operacion, valores_nuevos, correlacion_id)
          VALUES (${admin.id}, 'TRANSFORMACION', ${String(transformation.id)}, 'CREACION',
            ${JSON.stringify({ codigo: transformationCode, cantidadEntradaKg: 1, cantidadSalidaKg: 0.8 })}::jsonb,
            ${`trace:${suffix}:${index}`})
        `
      }
    })
    fixturesCreated = true

    const model = createTrazabilidadModel(db)
    const startedAt = process.hrtime.bigint()
    const trace = await model.getTrazabilidadCompleta(rootCode)
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6
    assert(trace?.aguasAbajo.length === 100, 'La consulta debe reconstruir las 100 transformaciones enlazadas')
    assert(
      trace.aguasAbajo.every((item) => item.lotesSalida.length === 1),
      'Cada transformación debe conservar la salida y su producto enlazado',
    )
    assert(durationMs <= 3000, `La consulta tardó ${durationMs.toFixed(2)} ms, excede 3000 ms`)

    const authService = {
      async authenticateToken(token) {
        if (token === 'admin') return { id: Number(admin.id), nombre: 'Administrador', roles: ['ADMINISTRADOR'] }
        if (token === 'operator') return { id: Number(admin.id), nombre: 'Operador', roles: ['OPERADOR'] }
        const error = new Error('Token inválido')
        error.name = 'AuthenticationError'
        throw error
      },
    }
    const app = createApp({ db, authService })
    const publicResponse = await request(app).get(`/api/public/productos/${productCode}`).expect(200)
    assert(publicResponse.body.estadoComercial === 'LIBERADO', 'La ficha debe reflejar el estado LIBERADO')
    assert(publicResponse.body.disponible === true, 'El producto liberado debe estar disponible')
    assert(publicResponse.body.lotes.length === 100, 'La ficha debe incluir los lotes del producto')
    const publicJson = JSON.stringify(publicResponse.body).toLowerCase()
    for (const privateField of ['identificacion', 'productorid', 'productornombre', 'precio', 'costo', 'usuarioid']) {
      assert(!publicJson.includes(privateField), `La ficha pública no debe exponer ${privateField}`)
    }

    await client`
      UPDATE lotes
      SET estado = 'BLOQUEADO'
      WHERE codigo = ${`TRACE-OUT-${suffix}-0`}
    `
    const blockedResponse = await request(app).get(`/api/public/productos/${productCode}`).expect(200)
    assert(blockedResponse.body.estadoComercial === 'BLOQUEADO', 'Un lote bloqueado debe bloquear la ficha comercial')
    assert(blockedResponse.body.disponible === false, 'Un producto bloqueado no debe ofrecerse como disponible')

    const csvResponse = await request(app)
      .get('/api/reportes/inventario.csv?municipio=La%20Plata&estado=LIBERADO')
      .set('Authorization', 'Bearer admin')
      .expect(200)
    assert(csvResponse.text.startsWith('\uFEFF'), 'El CSV debe usar BOM UTF-8')
    assert(csvResponse.text.includes('"La Plata, Huila"'), 'El CSV debe entrecomillar delimitadores')
    assert(csvResponse.text.includes('COP: 12345.67'), 'El CSV debe incluir costos asociados desde PostgreSQL')
    await request(app)
      .get('/api/reportes/inventario.csv')
      .set('Authorization', 'Bearer operator')
      .expect(403)

    console.log(
      `Trazabilidad: 100 transformaciones enlazadas; consulta ${durationMs.toFixed(2)} ms en Node ${process.version}, PostgreSQL y Docker Compose.`,
    )
    console.log('Ficha pública, bloqueo comercial y exportación CSV: correctos.')
  } finally {
    if (fixturesCreated) {
      await client`DELETE FROM auditoria_eventos WHERE correlacion_id LIKE ${`trace:${suffix}:%`}`
      await client`DELETE FROM costos_transformacion WHERE transformacion_id IN
        (SELECT id FROM transformaciones WHERE codigo LIKE ${`TRACE-TRANS-${suffix}-%`})`
      await client`DELETE FROM incidencias WHERE transformacion_id IN
        (SELECT id FROM transformaciones WHERE codigo LIKE ${`TRACE-TRANS-${suffix}-%`})`
      await client`DELETE FROM movimientos_inventario WHERE lote_id IN
        (SELECT id FROM lotes WHERE codigo = ${rootCode} OR codigo LIKE ${`TRACE-OUT-${suffix}-%`})`
      await client`DELETE FROM movimientos_inventario WHERE transformacion_id IN
        (SELECT id FROM transformaciones WHERE codigo LIKE ${`TRACE-TRANS-${suffix}-%`})`
      await client`DELETE FROM transformacion_lotes WHERE transformacion_id IN
        (SELECT id FROM transformaciones WHERE codigo LIKE ${`TRACE-TRANS-${suffix}-%`})`
      await client`DELETE FROM transformaciones WHERE codigo LIKE ${`TRACE-TRANS-${suffix}-%`}`
      await client`DELETE FROM lotes WHERE codigo = ${rootCode} OR codigo LIKE ${`TRACE-OUT-${suffix}-%`}`
      await client`DELETE FROM productos WHERE codigo = ${productCode}`
      await client`DELETE FROM productores WHERE identificacion = ${producerCode}`
    } else {
      await client`DELETE FROM auditoria_eventos WHERE correlacion_id LIKE ${`trace:${suffix}:%`}`
      await client`DELETE FROM movimientos_inventario WHERE clave_idempotencia LIKE ${`trace-%-${suffix}%`}`
      await client`DELETE FROM transformaciones WHERE codigo LIKE ${`TRACE-TRANS-${suffix}-%`}`
      await client`DELETE FROM lotes WHERE codigo = ${rootCode} OR codigo LIKE ${`TRACE-OUT-${suffix}-%`}`
      await client`DELETE FROM productos WHERE codigo = ${productCode}`
      await client`DELETE FROM productores WHERE identificacion = ${producerCode}`
    }
    await client.end()
  }
}

main().catch((error) => {
  console.error('Falló la prueba de trazabilidad:', error)
  process.exitCode = 1
})
