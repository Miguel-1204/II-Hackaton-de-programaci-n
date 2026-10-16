const { eq } = require('drizzle-orm')
const { runSeedCli } = require('./seed-utils')
const {
  lotes,
  movimientosInventario,
  productores,
  usuarios,
} = require('../../src/db/schema')

const demoLots = [
  { codigo: 'CAC001', municipio: 'Rivera', cantidad: 100 },
  { codigo: 'CAC002', municipio: 'Campoalegre', cantidad: 150 },
  { codigo: 'CAC003', municipio: 'Algeciras', cantidad: 80 },
]

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()

if (!adminEmail) {
  throw new Error('Configura ADMIN_EMAIL en Backend/.env antes del seed demo')
}

runSeedCli('demo', async (tx) => {
  const [admin] = await tx
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.correo, adminEmail))
    .limit(1)

  if (!admin) {
    throw new Error('Primero ejecuta npm run seed:admin')
  }

  for (const demo of demoLots) {
    let [producer] = await tx
      .select({ id: productores.id })
      .from(productores)
      .where(eq(productores.identificacion, demo.codigo))
      .limit(1)

    if (!producer) {
      ;[producer] = await tx
        .insert(productores)
        .values({
          nombre: demo.codigo,
          identificacion: demo.codigo,
          municipio: demo.municipio,
        })
        .onConflictDoNothing({ target: productores.identificacion })
        .returning({ id: productores.id })

      if (!producer) {
        ;[producer] = await tx
          .select({ id: productores.id })
          .from(productores)
          .where(eq(productores.identificacion, demo.codigo))
          .limit(1)
      }
    }

    if (!producer) {
      throw new Error(`No se encontró ni se pudo crear el productor ${demo.codigo}`)
    }

    const [existingLot] = await tx
      .select({ id: lotes.id })
      .from(lotes)
      .where(eq(lotes.codigo, demo.codigo))
      .limit(1)

    if (existingLot) {
      continue
    }

    const [lot] = await tx
      .insert(lotes)
      .values({
        codigo: demo.codigo,
        productorId: producer.id,
        cantidadRecibida: demo.cantidad,
        unidad: 'kg',
      })
      .onConflictDoNothing({ target: lotes.codigo })
      .returning({
        id: lotes.id,
        cantidadRecibida: lotes.cantidadRecibida,
        unidad: lotes.unidad,
      })

    if (!lot) {
      continue
    }

    await tx
      .insert(movimientosInventario)
      .values({
        loteId: lot.id,
        usuarioId: admin.id,
        tipoMovimiento: 'ENTRADA',
        cantidad: lot.cantidadRecibida,
        unidad: lot.unidad,
        claveIdempotencia: `seed-demo-inicial-${demo.codigo}`,
      })
      .onConflictDoNothing({
        target: movimientosInventario.claveIdempotencia,
      })
  }
})
