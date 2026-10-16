const {
  bigint,
  boolean,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} = require('drizzle-orm/pg-core')
const { sql } = require('drizzle-orm')

const id = (name = 'id') =>
  bigint(name, { mode: 'number' }).generatedAlwaysAsIdentity().primaryKey()
const createdAt = (name) =>
  timestamp(name, { withTimezone: true, mode: 'date' }).notNull().defaultNow()
const foreignId = (name, table, column = 'id') =>
  bigint(name, { mode: 'number' }).references(() => table[column])

const roles = pgTable('roles', {
  id: id(),
  nombre: varchar('nombre', { length: 100 }).notNull().unique(),
  descripcion: varchar('descripcion', { length: 255 }),
})

const usuarios = pgTable('usuarios', {
  id: id(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  correo: varchar('correo', { length: 320 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  activo: boolean('activo').notNull().default(true),
  creadoEn: createdAt('creado_en'),
  actualizadoEn: createdAt('actualizado_en'),
})

const usuarioRoles = pgTable(
  'usuario_roles',
  {
    usuarioId: foreignId('usuario_id', usuarios).notNull(),
    rolId: foreignId('rol_id', roles).notNull(),
    asignadoEn: createdAt('asignado_en'),
  },
  (table) => [primaryKey({ columns: [table.usuarioId, table.rolId] })],
)

const productores = pgTable(
  'productores',
  {
    id: id(),
    nombre: varchar('nombre', { length: 200 }).notNull(),
    identificacion: varchar('identificacion', { length: 100 })
      .notNull()
      .unique(),
    municipio: varchar('municipio', { length: 150 }).notNull(),
    activo: boolean('activo').notNull().default(true),
  },
  (table) => [index('productores_municipio_idx').on(table.municipio)],
)

const productos = pgTable('productos', {
  id: id(),
  codigo: varchar('codigo', { length: 100 }).notNull().unique(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  descripcion: text('descripcion'),
  imagenUrl: varchar('imagen_url', { length: 500 }),
  precioReferencia: numeric('precio_referencia', { precision: 14, scale: 2 }),
  unidadComercial: varchar('unidad_comercial', { length: 50 }),
  creadoEn: createdAt('creado_en'),
})

const lotes = pgTable(
  'lotes',
  {
    id: id(),
    codigo: varchar('codigo', { length: 100 }).notNull().unique(),
    productorId: foreignId('productor_id', productores).notNull(),
    productoId: foreignId('producto_id', productos),
    fechaRecepcion: date('fecha_recepcion')
      .notNull()
      .default(sql`CURRENT_DATE`),
    cantidadRecibida: numeric('cantidad_recibida', {
      precision: 14,
      scale: 3,
      mode: 'number',
    }).notNull(),
    unidad: varchar('unidad', { length: 50 }).notNull(),
    tipoMaterial: varchar('tipo_material', { length: 150 }),
    estado: varchar('estado', { length: 50 }).notNull().default('PENDIENTE'),
    creadoEn: createdAt('creado_en'),
  },
  (table) => [
    index('lotes_productor_id_idx').on(table.productorId),
    index('lotes_estado_idx').on(table.estado),
    check('lotes_cantidad_positiva_check', sql`${table.cantidadRecibida} > 0`),
    check(
      'lotes_unidad_no_vacia_check',
      sql`length(btrim(${table.unidad})) > 0`,
    ),
    check(
      'lotes_estado_check',
      sql`${table.estado} in ('PENDIENTE', 'LIBERADO', 'BLOQUEADO')`,
    ),
  ],
)

const transformaciones = pgTable(
  'transformaciones',
  {
    id: id(),
    codigo: varchar('codigo', { length: 100 }).notNull().unique(),
    etapa: varchar('etapa', { length: 100 }).notNull(),
    responsableId: foreignId('responsable_id', usuarios).notNull(),
    fecha: createdAt('fecha'),
    observaciones: text('observaciones'),
    estado: varchar('estado', { length: 50 }).notNull(),
    claveIdempotencia: varchar('clave_idempotencia', { length: 255 }).unique(),
  },
  (table) => [index('transformaciones_fecha_idx').on(table.fecha)],
)

const transformacionLotes = pgTable(
  'transformacion_lotes',
  {
    id: id(),
    transformacionId: foreignId('transformacion_id', transformaciones).notNull(),
    loteId: foreignId('lote_id', lotes).notNull(),
    tipoParticipacion: varchar('tipo_participacion', { length: 100 }).notNull(),
    cantidad: numeric('cantidad', {
      precision: 14,
      scale: 3,
      mode: 'number',
    }).notNull(),
    unidad: varchar('unidad', { length: 50 }).notNull(),
  },
  (table) => [
    uniqueIndex('transformacion_lotes_transformacion_lote_tipo_uniq').on(
      table.transformacionId,
      table.loteId,
      table.tipoParticipacion,
    ),
    index('transformacion_lotes_transformacion_id_idx').on(
      table.transformacionId,
    ),
    index('transformacion_lotes_lote_id_idx').on(table.loteId),
    check(
      'transformacion_lotes_tipo_participacion_check',
      sql`${table.tipoParticipacion} in ('ENTRADA', 'SALIDA')`,
    ),
    check(
      'transformacion_lotes_cantidad_positiva_check',
      sql`${table.cantidad} > 0`,
    ),
    check(
      'transformacion_lotes_unidad_no_vacia_check',
      sql`length(btrim(${table.unidad})) > 0`,
    ),
  ],
)

const ventas = pgTable(
  'ventas',
  {
    id: id(),
    loteId: foreignId('lote_id', lotes).notNull(),
    usuarioId: foreignId('usuario_id', usuarios).notNull(),
    cliente: varchar('cliente', { length: 200 }),
    cantidadKg: numeric('cantidad_kg', { precision: 14, scale: 3, mode: 'number' }).notNull(),
    precioUnitarioCop: numeric('precio_unitario_cop', { precision: 14, scale: 2, mode: 'number' }).notNull(),
    totalCop: numeric('total_cop', { precision: 16, scale: 2, mode: 'number' }).notNull(),
    claveIdempotencia: varchar('clave_idempotencia', { length: 180 }).notNull().unique(),
    fechaVenta: createdAt('fecha_venta'),
  },
  (table) => [
    index('ventas_lote_fecha_idx').on(table.loteId, table.fechaVenta),
    index('ventas_fecha_idx').on(table.fechaVenta),
    check('ventas_cantidad_positiva_check', sql`${table.cantidadKg} > 0`),
    check('ventas_precio_no_negativo_check', sql`${table.precioUnitarioCop} >= 0`),
    check('ventas_total_no_negativo_check', sql`${table.totalCop} >= 0`),
  ],
)

const movimientosInventario = pgTable(
  'movimientos_inventario',
  {
    id: id(),
    loteId: foreignId('lote_id', lotes).notNull(),
    transformacionId: foreignId('transformacion_id', transformaciones),
    ventaId: foreignId('venta_id', ventas),
    usuarioId: foreignId('usuario_id', usuarios).notNull(),
    tipoMovimiento: varchar('tipo_movimiento', { length: 100 }).notNull(),
    cantidad: numeric('cantidad', {
      precision: 14,
      scale: 3,
      mode: 'number',
    }).notNull(),
    unidad: varchar('unidad', { length: 50 }).notNull(),
    claveIdempotencia: varchar('clave_idempotencia', { length: 255 })
      .notNull()
      .unique(),
    creadoEn: createdAt('creado_en'),
  },
  (table) => [
    index('movimientos_inventario_lote_id_idx').on(table.loteId),
    index('movimientos_inventario_usuario_id_idx').on(table.usuarioId),
    index('movimientos_inventario_transformacion_fecha_idx').on(
      table.transformacionId,
      table.creadoEn,
    ),
    check(
      'movimientos_inventario_tipo_check',
      sql`${table.tipoMovimiento} in ('ENTRADA', 'SALIDA')`,
    ),
    check(
      'movimientos_inventario_cantidad_positiva_check',
      sql`${table.cantidad} > 0`,
    ),
  ],
)

const costosTransformacion = pgTable(
  'costos_transformacion',
  {
    id: id(),
    transformacionId: foreignId('transformacion_id', transformaciones).notNull(),
    concepto: varchar('concepto', { length: 150 }).notNull(),
    valor: numeric('valor', { precision: 14, scale: 2, mode: 'number' }).notNull(),
    moneda: varchar('moneda', { length: 10 }).notNull(),
    observaciones: text('observaciones'),
  },
  (table) => [
    index('costos_transformacion_transformacion_id_idx').on(
      table.transformacionId,
    ),
    check('costos_transformacion_valor_no_negativo_check', sql`${table.valor} >= 0`),
    check(
      'costos_transformacion_moneda_no_vacia_check',
      sql`length(btrim(${table.moneda})) > 0`,
    ),
  ],
)

const incidencias = pgTable(
  'incidencias',
  {
    id: id(),
    loteId: foreignId('lote_id', lotes).notNull(),
    transformacionId: foreignId('transformacion_id', transformaciones),
    usuarioId: foreignId('usuario_id', usuarios).notNull(),
    tipo: varchar('tipo', { length: 100 }).notNull(),
    descripcion: text('descripcion').notNull(),
    severidad: varchar('severidad', { length: 50 }).notNull(),
    estado: varchar('estado', { length: 50 }).notNull(),
    creadaEn: createdAt('creada_en'),
  },
  (table) => [
    index('incidencias_lote_id_idx').on(table.loteId),
    index('incidencias_transformacion_id_idx').on(table.transformacionId),
    index('incidencias_usuario_id_idx').on(table.usuarioId),
    index('incidencias_estado_creada_idx').on(table.estado, table.creadaEn),
  ],
)

const historialEstados = pgTable(
  'historial_estados',
  {
    id: id(),
    loteId: foreignId('lote_id', lotes).notNull(),
    usuarioId: foreignId('usuario_id', usuarios).notNull(),
    estadoAnterior: varchar('estado_anterior', { length: 50 }),
    estadoNuevo: varchar('estado_nuevo', { length: 50 }).notNull(),
    motivo: text('motivo'),
    cambiadoEn: createdAt('cambiado_en'),
  },
  (table) => [
    index('historial_estados_lote_id_idx').on(table.loteId),
    index('historial_estados_lote_fecha_idx').on(
      table.loteId,
      table.cambiadoEn,
    ),
    index('historial_estados_usuario_id_idx').on(table.usuarioId),
  ],
)

const auditoriaEventos = pgTable(
  'auditoria_eventos',
  {
    id: id(),
    usuarioId: foreignId('usuario_id', usuarios).notNull(),
    entidad: varchar('entidad', { length: 100 }).notNull(),
    entidadId: varchar('entidad_id', { length: 100 }).notNull(),
    operacion: varchar('operacion', { length: 100 }).notNull(),
    valoresAnteriores: jsonb('valores_anteriores'),
    valoresNuevos: jsonb('valores_nuevos'),
    fechaEvento: createdAt('fecha_evento'),
    correlacionId: varchar('correlacion_id', { length: 255 }),
  },
  (table) => [index('auditoria_eventos_usuario_id_idx').on(table.usuarioId)],
)

module.exports = {
  auditoriaEventos,
  costosTransformacion,
  historialEstados,
  incidencias,
  lotes,
  movimientosInventario,
  productores,
  productos,
  roles,
  transformacionLotes,
  transformaciones,
  usuarioRoles,
  usuarios,
  ventas,
}
