CREATE INDEX "historial_estados_lote_fecha_idx" ON "historial_estados" USING btree ("lote_id","cambiado_en");--> statement-breakpoint
CREATE INDEX "incidencias_estado_creada_idx" ON "incidencias" USING btree ("estado","creada_en");--> statement-breakpoint
CREATE INDEX "lotes_estado_idx" ON "lotes" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "movimientos_inventario_transformacion_fecha_idx" ON "movimientos_inventario" USING btree ("transformacion_id","creado_en");--> statement-breakpoint
CREATE INDEX "productores_municipio_idx" ON "productores" USING btree ("municipio");--> statement-breakpoint
CREATE UNIQUE INDEX "transformacion_lotes_transformacion_lote_tipo_uniq" ON "transformacion_lotes" USING btree ("transformacion_id","lote_id","tipo_participacion");--> statement-breakpoint
CREATE INDEX "transformaciones_fecha_idx" ON "transformaciones" USING btree ("fecha");--> statement-breakpoint
ALTER TABLE "costos_transformacion" ADD CONSTRAINT "costos_transformacion_valor_no_negativo_check" CHECK ("costos_transformacion"."valor" >= 0);--> statement-breakpoint
ALTER TABLE "costos_transformacion" ADD CONSTRAINT "costos_transformacion_moneda_no_vacia_check" CHECK (length(btrim("costos_transformacion"."moneda")) > 0);--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_cantidad_positiva_check" CHECK ("lotes"."cantidad_recibida" > 0);--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_unidad_no_vacia_check" CHECK (length(btrim("lotes"."unidad")) > 0);--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_tipo_check" CHECK ("movimientos_inventario"."tipo_movimiento" in ('ENTRADA', 'SALIDA'));--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_cantidad_positiva_check" CHECK ("movimientos_inventario"."cantidad" > 0);--> statement-breakpoint
ALTER TABLE "transformacion_lotes" ADD CONSTRAINT "transformacion_lotes_tipo_participacion_check" CHECK ("transformacion_lotes"."tipo_participacion" in ('ENTRADA', 'SALIDA'));--> statement-breakpoint
ALTER TABLE "transformacion_lotes" ADD CONSTRAINT "transformacion_lotes_cantidad_positiva_check" CHECK ("transformacion_lotes"."cantidad" > 0);--> statement-breakpoint
ALTER TABLE "transformacion_lotes" ADD CONSTRAINT "transformacion_lotes_unidad_no_vacia_check" CHECK (length(btrim("transformacion_lotes"."unidad")) > 0);--> statement-breakpoint
CREATE FUNCTION "cantidad_a_kg"(cantidad numeric, unidad text) RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE lower(btrim(unidad))
    WHEN 'kg' THEN cantidad
    WHEN 'kilogramo' THEN cantidad
    WHEN 'kilogramos' THEN cantidad
    WHEN 'g' THEN cantidad / 1000
    WHEN 'gramo' THEN cantidad / 1000
    WHEN 'gramos' THEN cantidad / 1000
    WHEN 't' THEN cantidad * 1000
    WHEN 'ton' THEN cantidad * 1000
    WHEN 'tonelada' THEN cantidad * 1000
    WHEN 'toneladas' THEN cantidad * 1000
    ELSE NULL
  END
$$;--> statement-breakpoint
CREATE VIEW "analitica_transformacion_merma" AS
WITH participaciones AS (
  SELECT
    tl.transformacion_id,
    tl.tipo_participacion,
    "cantidad_a_kg"(tl.cantidad, tl.unidad) AS cantidad_kg
  FROM transformacion_lotes tl
),
totales AS (
  SELECT
    transformacion_id,
    count(*) FILTER (WHERE tipo_participacion = 'ENTRADA') AS entradas_registradas,
    count(*) FILTER (WHERE tipo_participacion = 'SALIDA') AS salidas_registradas,
    count(*) FILTER (
      WHERE tipo_participacion = 'ENTRADA' AND cantidad_kg IS NULL
    ) AS entradas_no_comparables,
    count(*) FILTER (
      WHERE tipo_participacion = 'SALIDA' AND cantidad_kg IS NULL
    ) AS salidas_no_comparables,
    sum(cantidad_kg) FILTER (WHERE tipo_participacion = 'ENTRADA') AS entrada_kg,
    sum(cantidad_kg) FILTER (WHERE tipo_participacion = 'SALIDA') AS salida_kg
  FROM participaciones
  GROUP BY transformacion_id
)
SELECT
  t.id AS transformacion_id,
  t.codigo AS transformacion_codigo,
  t.etapa,
  t.fecha AS fecha_procesamiento,
  t.estado AS estado_transformacion,
  coalesce(x.entradas_registradas, 0) AS entradas_registradas,
  coalesce(x.salidas_registradas, 0) AS salidas_registradas,
  CASE
    WHEN coalesce(x.entradas_registradas, 0) = 0
      OR coalesce(x.salidas_registradas, 0) = 0 THEN 'SIN_ENTRADAS_O_SALIDAS'
    WHEN coalesce(x.entradas_no_comparables, 0) > 0
      OR coalesce(x.salidas_no_comparables, 0) > 0 THEN 'UNIDADES_NO_COMPARABLES'
    ELSE 'EVALUABLE'
  END AS estado_evaluacion,
  CASE
    WHEN coalesce(x.entradas_registradas, 0) > 0
      AND coalesce(x.salidas_registradas, 0) > 0
      AND coalesce(x.entradas_no_comparables, 0) = 0
      AND coalesce(x.salidas_no_comparables, 0) = 0
    THEN x.entrada_kg
    ELSE NULL
  END AS entrada_kg,
  CASE
    WHEN coalesce(x.entradas_registradas, 0) > 0
      AND coalesce(x.salidas_registradas, 0) > 0
      AND coalesce(x.entradas_no_comparables, 0) = 0
      AND coalesce(x.salidas_no_comparables, 0) = 0
    THEN x.salida_kg
    ELSE NULL
  END AS salida_kg,
  CASE
    WHEN coalesce(x.entradas_registradas, 0) > 0
      AND coalesce(x.salidas_registradas, 0) > 0
      AND coalesce(x.entradas_no_comparables, 0) = 0
      AND coalesce(x.salidas_no_comparables, 0) = 0
    THEN x.entrada_kg - x.salida_kg
    ELSE NULL
  END AS merma_kg,
  CASE
    WHEN coalesce(x.entradas_registradas, 0) > 0
      AND coalesce(x.salidas_registradas, 0) > 0
      AND coalesce(x.entradas_no_comparables, 0) = 0
      AND coalesce(x.salidas_no_comparables, 0) = 0
    THEN ((x.entrada_kg - x.salida_kg) / x.entrada_kg) * 100
    ELSE NULL
  END AS merma_porcentaje,
  15::numeric AS umbral_porcentaje,
  CASE
    WHEN coalesce(x.entradas_registradas, 0) > 0
      AND coalesce(x.salidas_registradas, 0) > 0
      AND coalesce(x.entradas_no_comparables, 0) = 0
      AND coalesce(x.salidas_no_comparables, 0) = 0
    THEN ((x.entrada_kg - x.salida_kg) / x.entrada_kg) * 100 > 15
    ELSE NULL
  END AS supera_umbral
FROM transformaciones t
LEFT JOIN totales x ON x.transformacion_id = t.id;--> statement-breakpoint
CREATE VIEW "analitica_merma_productor" AS
WITH participaciones AS (
  SELECT
    tr.id AS transformacion_id,
    tr.codigo AS transformacion_codigo,
    tr.etapa,
    tr.fecha AS fecha_procesamiento,
    tr.estado AS estado_transformacion,
    p.id AS productor_id,
    p.nombre AS productor_nombre,
    p.municipio,
    tl.tipo_participacion,
    tl.cantidad,
    tl.unidad,
    "cantidad_a_kg"(tl.cantidad, tl.unidad) AS cantidad_kg,
    l.codigo AS lote_codigo
  FROM transformacion_lotes tl
  JOIN transformaciones tr ON tr.id = tl.transformacion_id
  JOIN lotes l ON l.id = tl.lote_id
  JOIN productores p ON p.id = l.productor_id
),
por_productor AS (
  SELECT
    transformacion_id,
    transformacion_codigo,
    etapa,
    fecha_procesamiento,
    estado_transformacion,
    productor_id,
    productor_nombre,
    municipio,
    count(*) FILTER (WHERE tipo_participacion = 'ENTRADA') AS filas_entrada,
    count(*) FILTER (WHERE tipo_participacion = 'SALIDA') AS filas_salida,
    count(*) FILTER (
      WHERE tipo_participacion = 'ENTRADA' AND cantidad_kg IS NULL
    ) AS entradas_no_comparables,
    count(*) FILTER (
      WHERE tipo_participacion = 'SALIDA' AND cantidad_kg IS NULL
    ) AS salidas_no_comparables,
    sum(cantidad_kg) FILTER (WHERE tipo_participacion = 'ENTRADA') AS entrada_kg,
    sum(cantidad_kg) FILTER (WHERE tipo_participacion = 'SALIDA') AS salida_kg,
    jsonb_agg(
      jsonb_build_object(
        'lote_codigo', lote_codigo,
        'participacion', tipo_participacion,
        'cantidad', cantidad,
        'unidad', unidad
      )
      ORDER BY lote_codigo, tipo_participacion
    ) AS lotes_involucrados
  FROM participaciones
  GROUP BY
    transformacion_id,
    transformacion_codigo,
    etapa,
    fecha_procesamiento,
    estado_transformacion,
    productor_id,
    productor_nombre,
    municipio
),
cobertura AS (
  SELECT
    transformacion_id,
    count(*) FILTER (WHERE filas_entrada > 0) AS productores_entrada,
    count(*) FILTER (WHERE filas_salida > 0) AS productores_salida,
    count(*) FILTER (
      WHERE filas_entrada = 0 OR filas_salida = 0
    ) AS productores_sin_par_entrada_salida
  FROM por_productor
  GROUP BY transformacion_id
),
resultado AS (
  SELECT
    pp.*,
    CASE
      WHEN at.estado_evaluacion <> 'EVALUABLE'
        THEN at.estado_evaluacion
      WHEN coalesce(c.productores_sin_par_entrada_salida, 0) > 0
        OR c.productores_entrada <> c.productores_salida
        THEN 'PRODUCTORES_ENTRADA_SALIDA_NO_COINCIDEN'
      ELSE 'EVALUABLE'
    END AS estado_evaluacion
  FROM por_productor pp
  JOIN cobertura c ON c.transformacion_id = pp.transformacion_id
  JOIN analitica_transformacion_merma at
    ON at.transformacion_id = pp.transformacion_id
)
SELECT
  r.transformacion_id,
  r.transformacion_codigo,
  r.etapa,
  r.fecha_procesamiento,
  r.estado_transformacion,
  r.productor_id,
  r.productor_nombre,
  r.municipio,
  CASE WHEN r.estado_evaluacion = 'EVALUABLE' THEN r.entrada_kg END AS entrada_kg,
  CASE WHEN r.estado_evaluacion = 'EVALUABLE' THEN r.salida_kg END AS salida_kg,
  CASE
    WHEN r.estado_evaluacion = 'EVALUABLE' THEN r.entrada_kg - r.salida_kg
  END AS merma_kg,
  CASE
    WHEN r.estado_evaluacion = 'EVALUABLE' AND r.entrada_kg > 0
    THEN ((r.entrada_kg - r.salida_kg) / r.entrada_kg) * 100
  END AS merma_porcentaje,
  15::numeric AS umbral_porcentaje,
  r.estado_evaluacion,
  CASE
    WHEN r.estado_evaluacion = 'EVALUABLE'
      AND r.filas_entrada > 0
      AND r.filas_salida > 0
      AND r.entrada_kg > 0
    THEN ((r.entrada_kg - r.salida_kg) / r.entrada_kg) * 100 > 15
    ELSE NULL
  END AS supera_umbral,
  r.lotes_involucrados
FROM resultado r;--> statement-breakpoint
CREATE VIEW "analitica_costos_transformacion" AS
SELECT
  ct.id AS costo_id,
  tr.id AS transformacion_id,
  tr.codigo AS transformacion_codigo,
  tr.fecha AS fecha_procesamiento,
  tr.estado AS estado_transformacion,
  ct.concepto,
  ct.valor,
  ct.moneda
FROM costos_transformacion ct
JOIN transformaciones tr ON tr.id = ct.transformacion_id;--> statement-breakpoint
CREATE VIEW "analitica_costos_por_transformacion" AS
SELECT
  transformacion_id,
  transformacion_codigo,
  fecha_procesamiento,
  estado_transformacion,
  moneda,
  count(*) AS conceptos_costo,
  sum(valor) AS costo_total
FROM analitica_costos_transformacion
GROUP BY
  transformacion_id,
  transformacion_codigo,
  fecha_procesamiento,
  estado_transformacion,
  moneda;--> statement-breakpoint
CREATE VIEW "analitica_inventario_lotes" AS
WITH movimientos AS (
  SELECT
    mi.lote_id,
    count(*) AS movimientos_registrados,
    count(*) FILTER (
      WHERE "cantidad_a_kg"(mi.cantidad, mi.unidad) IS NULL
    ) AS movimientos_no_comparables,
    sum(
      CASE mi.tipo_movimiento
        WHEN 'ENTRADA' THEN "cantidad_a_kg"(mi.cantidad, mi.unidad)
        WHEN 'SALIDA' THEN -"cantidad_a_kg"(mi.cantidad, mi.unidad)
      END
    ) AS saldo_kg
  FROM movimientos_inventario mi
  GROUP BY mi.lote_id
)
SELECT
  l.id AS lote_id,
  l.codigo AS lote_codigo,
  p.id AS productor_id,
  p.nombre AS productor_nombre,
  p.municipio,
  l.unidad AS unidad_lote,
  "cantidad_a_kg"(l.cantidad_recibida, l.unidad) AS cantidad_recibida_kg,
  coalesce(m.movimientos_registrados, 0) AS movimientos_registrados,
  CASE
    WHEN "cantidad_a_kg"(l.cantidad_recibida, l.unidad) IS NOT NULL
      AND coalesce(m.movimientos_no_comparables, 0) = 0
    THEN coalesce(m.saldo_kg, 0)
    ELSE NULL
  END AS saldo_inventario_kg,
  CASE
    WHEN "cantidad_a_kg"(l.cantidad_recibida, l.unidad) IS NOT NULL
      AND coalesce(m.movimientos_no_comparables, 0) = 0
    THEN 'EVALUABLE'
    ELSE 'UNIDADES_NO_COMPARABLES'
  END AS estado_evaluacion
FROM lotes l
JOIN productores p ON p.id = l.productor_id
LEFT JOIN movimientos m ON m.lote_id = l.id;--> statement-breakpoint
CREATE VIEW "analitica_estado_lotes" AS
WITH incidencias_agrupadas AS (
  SELECT
    lote_id,
    count(*) FILTER (
      WHERE estado IN ('ABIERTA', 'ABIERTO', 'EN_PROCESO')
    ) AS incidencias_abiertas,
    jsonb_object_agg(estado, cantidad) AS incidencias_por_estado
  FROM (
    SELECT
      lote_id,
      upper(btrim(estado)) AS estado,
      count(*) AS cantidad
    FROM incidencias
    GROUP BY lote_id, upper(btrim(estado))
  ) i
  GROUP BY lote_id
)
SELECT
  l.id AS lote_id,
  l.codigo AS lote_codigo,
  p.id AS productor_id,
  p.nombre AS productor_nombre,
  p.municipio,
  l.estado AS estado_actual,
  (upper(btrim(l.estado)) = 'BLOQUEADO') AS bloqueado,
  CASE
    WHEN upper(btrim(l.estado)) = 'BLOQUEADO' THEN h.motivo
    ELSE NULL
  END AS motivo_estado_actual,
  coalesce(i.incidencias_abiertas, 0) AS incidencias_abiertas,
  coalesce(i.incidencias_por_estado, '{}'::jsonb) AS incidencias_por_estado
FROM lotes l
JOIN productores p ON p.id = l.productor_id
LEFT JOIN LATERAL (
  SELECT he.motivo
  FROM historial_estados he
  WHERE he.lote_id = l.id
    AND upper(btrim(he.estado_nuevo)) = upper(btrim(l.estado))
  ORDER BY he.cambiado_en DESC, he.id DESC
  LIMIT 1
) h ON true
LEFT JOIN incidencias_agrupadas i ON i.lote_id = l.id;--> statement-breakpoint
CREATE VIEW "analitica_incidencias" AS
SELECT
  i.id AS incidencia_id,
  i.lote_id,
  l.codigo AS lote_codigo,
  p.id AS productor_id,
  p.nombre AS productor_nombre,
  p.municipio,
  i.transformacion_id,
  tr.codigo AS transformacion_codigo,
  i.tipo,
  i.severidad,
  upper(btrim(i.estado)) AS estado,
  (upper(btrim(i.estado)) IN ('ABIERTA', 'ABIERTO', 'EN_PROCESO')) AS abierta,
  i.creada_en
FROM incidencias i
JOIN lotes l ON l.id = i.lote_id
JOIN productores p ON p.id = l.productor_id
LEFT JOIN transformaciones tr ON tr.id = i.transformacion_id;