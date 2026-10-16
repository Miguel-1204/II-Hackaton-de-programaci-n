require('dotenv').config()

const postgres = require('postgres')

const TOTAL_LOTES = 100
const IDENTIFICACION_PRODUCTOR = 'SINTETICO-PRUEBA13'
const PREFIJO_LOTE = 'P13-TRAZ-'
const CLAVE_AUDITORIA = 'PRUEBA13:'

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL debe estar configurada para crear los datos de Prueba 13')
  }

  const client = postgres(process.env.DATABASE_URL, { max: 1 })
  try {
    const resultado = await client.begin(async (tx) => {
      const [admin] = await tx`
        SELECT u.id
        FROM usuarios u
        JOIN usuario_roles ur ON ur.usuario_id = u.id
        JOIN roles r ON r.id = ur.rol_id
        WHERE u.activo = TRUE AND r.nombre = 'ADMINISTRADOR'
        ORDER BY u.id
        LIMIT 1
      `
      if (!admin) throw new Error('No hay un usuario administrador activo para registrar los movimientos')

      await tx`
        INSERT INTO productores (nombre, identificacion, municipio, activo)
        VALUES ('Productor sintético - Prueba 13', ${IDENTIFICACION_PRODUCTOR}, 'Registro de prueba', TRUE)
        ON CONFLICT (identificacion) DO NOTHING
      `
      const [productor] = await tx`
        SELECT id FROM productores WHERE identificacion = ${IDENTIFICACION_PRODUCTOR}
      `

      await tx`
        INSERT INTO lotes
          (codigo, productor_id, producto_id, fecha_recepcion, cantidad_recibida, unidad, tipo_material, estado)
        SELECT
          ${PREFIJO_LOTE} || lpad(numero::text, 3, '0'),
          ${productor.id},
          NULL,
          CURRENT_DATE,
          1,
          'kg',
          'PRUEBA 13 - LOTE SINTÉTICO',
          'PENDIENTE'
        FROM generate_series(1, ${TOTAL_LOTES}) AS numero
        ON CONFLICT (codigo) DO NOTHING
      `

      const lotes = await tx`
        SELECT id, codigo, productor_id
        FROM lotes
        WHERE codigo >= ${`${PREFIJO_LOTE}001`}
          AND codigo <= ${`${PREFIJO_LOTE}100`}
        ORDER BY codigo
      `
      if (lotes.length !== TOTAL_LOTES || lotes.some((lote) => Number(lote.productor_id) !== Number(productor.id))) {
        throw new Error('Los códigos P13-TRAZ ya existen con datos diferentes; no se modificó la base de datos')
      }

      await tx`
        INSERT INTO movimientos_inventario
          (lote_id, usuario_id, tipo_movimiento, cantidad, unidad, clave_idempotencia)
        SELECT
          l.id,
          ${admin.id},
          'ENTRADA',
          1,
          'kg',
          ${'prueba13:entrada:'} || l.codigo
        FROM lotes l
        WHERE l.codigo >= ${`${PREFIJO_LOTE}001`}
          AND l.codigo <= ${`${PREFIJO_LOTE}100`}
        ON CONFLICT (clave_idempotencia) DO NOTHING
      `

      await tx`
        INSERT INTO auditoria_eventos
          (usuario_id, entidad, entidad_id, operacion, valores_nuevos, correlacion_id)
        SELECT
          ${admin.id},
          'LOTE',
          l.id::text,
          'RECEPCION_SINTETICA',
          jsonb_build_object('codigo', l.codigo, 'cantidad', 1, 'unidad', 'kg', 'prueba', 13),
          ${CLAVE_AUDITORIA} || l.codigo
        FROM lotes l
        WHERE l.codigo >= ${`${PREFIJO_LOTE}001`}
          AND l.codigo <= ${`${PREFIJO_LOTE}100`}
          AND NOT EXISTS (
            SELECT 1 FROM auditoria_eventos ae
            WHERE ae.correlacion_id = ${CLAVE_AUDITORIA} || l.codigo
          )
      `

      return {
        lotes: lotes.length,
        movimientos: await tx`
          SELECT count(*)::int AS total
          FROM movimientos_inventario mi
          JOIN lotes l ON l.id = mi.lote_id
          WHERE l.codigo >= ${`${PREFIJO_LOTE}001`}
            AND l.codigo <= ${`${PREFIJO_LOTE}100`}
            AND mi.tipo_movimiento = 'ENTRADA'
        `,
        codigoParaConsultar: `${PREFIJO_LOTE}001`,
      }
    })

    console.log(`Lotes sintéticos Prueba 13: ${resultado.lotes}/${TOTAL_LOTES}`)
    console.log(`Movimientos de entrada: ${resultado.movimientos[0].total}`)
    console.log(`Código sugerido para consultar trazabilidad: ${resultado.codigoParaConsultar}`)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('No se pudieron crear los datos de Prueba 13:', error.message)
  process.exitCode = 1
})
