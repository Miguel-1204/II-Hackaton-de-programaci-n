CREATE TABLE "ventas" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ventas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"lote_id" bigint NOT NULL,
	"usuario_id" bigint NOT NULL,
	"cliente" varchar(200),
	"cantidad_kg" numeric(14, 3) NOT NULL,
	"precio_unitario_cop" numeric(14, 2) NOT NULL,
	"total_cop" numeric(16, 2) NOT NULL,
	"clave_idempotencia" varchar(180) NOT NULL,
	"fecha_venta" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ventas_clave_idempotencia_unique" UNIQUE("clave_idempotencia"),
	CONSTRAINT "ventas_cantidad_positiva_check" CHECK ("ventas"."cantidad_kg" > 0),
	CONSTRAINT "ventas_precio_no_negativo_check" CHECK ("ventas"."precio_unitario_cop" >= 0),
	CONSTRAINT "ventas_total_no_negativo_check" CHECK ("ventas"."total_cop" >= 0)
);
--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD COLUMN "venta_id" bigint;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ventas_lote_fecha_idx" ON "ventas" USING btree ("lote_id","fecha_venta");--> statement-breakpoint
CREATE INDEX "ventas_fecha_idx" ON "ventas" USING btree ("fecha_venta");--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_venta_id_ventas_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id") ON DELETE no action ON UPDATE no action;