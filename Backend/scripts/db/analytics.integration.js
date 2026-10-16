require('dotenv').config()

const postgres = require('postgres')
const { randomUUID } = require('node:crypto')
const rollback = new Error('Rollback analytics test fixtures')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL debe estar configurada para probar las vistas')
  }

  const client = postgres(process.env.DATABASE_URL, { max: 1 })
  let checks = 0

  try {
    try {
      await client.begin(async (tx) => {
        const [admin] = await tx`
          SELECT u.id
          FROM usuarios u
          JOIN usuario_roles ur ON ur.usuario_id = u.id
          JOIN roles r ON r.id = ur.rol_id
          WHERE u.activo = true AND r.nombre = 'ADMINISTRADOR'
          ORDER BY u.id
          LIMIT 1
        `
        const lots = await tx`
          SELECT l.id, l.codigo, l.productor_id
          FROM lotes l
          WHERE l.codigo IN ('CAC001', 'CAC002', 'CAC003')
          ORDER BY l.codigo
        `

        assert(admin, 'Primero ejecuta los seeds de roles y administrador')
        assert(lots.length === 3, 'Primero ejecuta el seed de lotes oficiales')

        const lotByCode = new Map(lots.map((lot) => [lot.codigo, lot]))
        const createTransformation = async (suffix) => {
          const [transformation] = await tx`
            INSERT INTO transformaciones (codigo, etapa, responsable_id, estado)
            VALUES (${`TEST-ANALYTICS-${suffix}-${randomUUID()}`},
              'PRUEBA', ${admin.id}, 'COMPLETADA')
            RETURNING id
          `
          return transformation.id
        }
        const addParticipation = async (transformId, code, role, quantity, unit) =>
          tx`
            INSERT INTO transformacion_lotes
              (transformacion_id, lote_id, tipo_participacion, cantidad, unidad)
            VALUES (${transformId}, ${lotByCode.get(code).id}, ${role}, ${quantity}, ${unit})
          `

        const singleProducerTransform = await createTransformation('SINGLE')
        await addParticipation(singleProducerTransform, 'CAC001', 'ENTRADA', 1000, 'g')
        await addParticipation(singleProducerTransform, 'CAC001', 'SALIDA', 0.8, 'kg')

        const [singleResult] = await tx`
          SELECT entrada_kg, salida_kg, merma_kg, merma_porcentaje,
            supera_umbral, estado_evaluacion
          FROM analitica_transformacion_merma
          WHERE transformacion_id = ${singleProducerTransform}
        `
        assert(singleResult.estado_evaluacion === 'EVALUABLE', 'La transformación comparable debe ser evaluable')
        assert(Number(singleResult.entrada_kg) === 1, '1000 g deben normalizarse a 1 kg')
        assert(Number(singleResult.salida_kg) === 0.8, 'La salida debe normalizarse a kg')
        assert(Math.abs(Number(singleResult.merma_porcentaje) - 20) < 0.0001, 'La merma debe ser 20 %')
        assert(singleResult.supera_umbral === true, '20 % debe superar estrictamente el umbral de 15 %')
        checks += 5

        const [producerResult] = await tx`
          SELECT estado_evaluacion, productor_id, municipio, lotes_involucrados
          FROM analitica_merma_productor
          WHERE transformacion_id = ${singleProducerTransform}
            AND productor_id = ${lotByCode.get('CAC001').productor_id}
        `
        assert(producerResult.estado_evaluacion === 'EVALUABLE', 'El detalle por productor debe conservar atribución verificable')
        assert(producerResult.municipio === 'Rivera', 'El detalle debe devolver el municipio')
        assert(producerResult.lotes_involucrados.length === 2, 'El reporte debe incluir lotes de entrada y salida')
        checks += 3

        await tx`
          INSERT INTO costos_transformacion (transformacion_id, concepto, valor, moneda)
          VALUES (${singleProducerTransform}, 'Prueba A', 10, 'COP'),
            (${singleProducerTransform}, 'Prueba B', 20, 'COP')
        `
        const costRows = await tx`
          SELECT costo_id FROM analitica_costos_transformacion
          WHERE transformacion_id = ${singleProducerTransform}
        `
        const [costTotal] = await tx`
          SELECT conceptos_costo, costo_total
          FROM analitica_costos_por_transformacion
          WHERE transformacion_id = ${singleProducerTransform} AND moneda = 'COP'
        `
        assert(costRows.length === 2, 'La vista detalle debe conservar cada línea de costo una vez')
        assert(Number(costTotal.conceptos_costo) === 2 && Number(costTotal.costo_total) === 30, 'La vista agregada no debe multiplicar costos')
        checks += 2

        const mixedTransform = await createTransformation('MIXED')
        await addParticipation(mixedTransform, 'CAC001', 'ENTRADA', 100, 'kg')
        await addParticipation(mixedTransform, 'CAC002', 'ENTRADA', 100, 'kg')
        await addParticipation(mixedTransform, 'CAC001', 'SALIDA', 160, 'kg')
        const producerAssessments = await tx`
          SELECT estado_evaluacion, entrada_kg, salida_kg, merma_porcentaje,
            supera_umbral
          FROM analitica_merma_productor
          WHERE transformacion_id = ${mixedTransform}
        `
        assert(producerAssessments.length === 2, 'La mezcla debe producir una fila por productor de entrada')
        assert(producerAssessments.every((row) =>
          row.estado_evaluacion === 'PRODUCTORES_ENTRADA_SALIDA_NO_COINCIDEN'
          && row.entrada_kg === null
          && row.salida_kg === null
          && row.merma_porcentaje === null
          && row.supera_umbral === null
        ), 'No se debe atribuir merma a productores sin salida asignada verificablemente')
        checks += 2

        const unknownUnitTransform = await createTransformation('UNKNOWN-UNIT')
        await addParticipation(unknownUnitTransform, 'CAC003', 'ENTRADA', 100, 'saco')
        await addParticipation(unknownUnitTransform, 'CAC003', 'SALIDA', 80, 'kg')
        const [unknownUnitResult] = await tx`
          SELECT estado_evaluacion, merma_porcentaje, supera_umbral
          FROM analitica_transformacion_merma
          WHERE transformacion_id = ${unknownUnitTransform}
        `
        assert(unknownUnitResult.estado_evaluacion === 'UNIDADES_NO_COMPARABLES', 'Unidades desconocidas deben marcarse no evaluables')
        assert(unknownUnitResult.merma_porcentaje === null && unknownUnitResult.supera_umbral === null, 'No se debe calcular una merma con unidades incompatibles')
        checks += 2

        const lotToBlock = lotByCode.get('CAC003')
        const [previousState] = await tx`
          SELECT estado FROM lotes WHERE id = ${lotToBlock.id}
        `
        await tx`
          UPDATE lotes SET estado = 'BLOQUEADO' WHERE id = ${lotToBlock.id}
        `
        await tx`
          INSERT INTO historial_estados
            (lote_id, usuario_id, estado_anterior, estado_nuevo, motivo)
          VALUES (${lotToBlock.id}, ${admin.id}, ${previousState.estado},
            'BLOQUEADO', 'Motivo de bloqueo de prueba')
        `
        await tx`
          INSERT INTO incidencias
            (lote_id, usuario_id, tipo, descripcion, severidad, estado)
          VALUES (${lotToBlock.id}, ${admin.id}, 'PRUEBA',
            'Incidencia de prueba', 'BAJA', 'ABIERTA')
        `
        const [lotAnalytics] = await tx`
          SELECT bloqueado, motivo_estado_actual, incidencias_abiertas
          FROM analitica_estado_lotes
          WHERE lote_id = ${lotToBlock.id}
        `
        assert(lotAnalytics.bloqueado === true, 'La vista debe identificar lotes bloqueados')
        assert(lotAnalytics.motivo_estado_actual === 'Motivo de bloqueo de prueba', 'La vista debe exponer el motivo asociado al último cambio vigente')
        assert(Number(lotAnalytics.incidencias_abiertas) === 1, 'La vista debe contar incidencias abiertas sin duplicar lotes')
        checks += 3

        const [inventory] = await tx`
          SELECT saldo_inventario_kg, estado_evaluacion
          FROM analitica_inventario_lotes
          WHERE lote_id = ${lotByCode.get('CAC001').id}
        `
        assert(inventory.estado_evaluacion === 'EVALUABLE', 'El inventario con unidad de masa debe ser comparable')
        assert(Number(inventory.saldo_inventario_kg) === 100, 'El saldo debe reflejar las entradas iniciales existentes')
        checks += 2

        throw rollback
      })
    } catch (error) {
      if (error !== rollback) {
        throw error
      }
    }

    console.log(`Pruebas analíticas correctas: ${checks} comprobaciones; todos los datos de prueba se revirtieron.`)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('Falló la prueba de analítica:', error.message)
  process.exitCode = 1
})
