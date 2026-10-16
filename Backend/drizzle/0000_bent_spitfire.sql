CREATE TABLE "auditoria_eventos" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auditoria_eventos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"usuario_id" bigint NOT NULL,
	"entidad" varchar(100) NOT NULL,
	"entidad_id" varchar(100) NOT NULL,
	"operacion" varchar(100) NOT NULL,
	"valores_anteriores" jsonb,
	"valores_nuevos" jsonb,
	"fecha_evento" timestamp with time zone DEFAULT now() NOT NULL,
	"correlacion_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "costos_transformacion" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "costos_transformacion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"transformacion_id" bigint NOT NULL,
	"concepto" varchar(150) NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"moneda" varchar(10) NOT NULL,
	"observaciones" text
);
--> statement-breakpoint
CREATE TABLE "historial_estados" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "historial_estados_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"lote_id" bigint NOT NULL,
	"usuario_id" bigint NOT NULL,
	"estado_anterior" varchar(50),
	"estado_nuevo" varchar(50) NOT NULL,
	"motivo" text,
	"cambiado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidencias" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "incidencias_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"lote_id" bigint NOT NULL,
	"transformacion_id" bigint,
	"usuario_id" bigint NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"descripcion" text NOT NULL,
	"severidad" varchar(50) NOT NULL,
	"estado" varchar(50) NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lotes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"codigo" varchar(100) NOT NULL,
	"productor_id" bigint NOT NULL,
	"producto_id" bigint,
	"fecha_recepcion" date DEFAULT CURRENT_DATE NOT NULL,
	"cantidad_recibida" numeric(14, 3) NOT NULL,
	"unidad" varchar(50) NOT NULL,
	"tipo_material" varchar(150),
	"estado" varchar(50) DEFAULT 'RECIBIDO' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lotes_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "movimientos_inventario" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "movimientos_inventario_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"lote_id" bigint NOT NULL,
	"transformacion_id" bigint,
	"usuario_id" bigint NOT NULL,
	"tipo_movimiento" varchar(100) NOT NULL,
	"cantidad" numeric(14, 3) NOT NULL,
	"unidad" varchar(50) NOT NULL,
	"clave_idempotencia" varchar(255) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimientos_inventario_clave_idempotencia_unique" UNIQUE("clave_idempotencia")
);
--> statement-breakpoint
CREATE TABLE "productores" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "productores_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"nombre" varchar(200) NOT NULL,
	"identificacion" varchar(100) NOT NULL,
	"municipio" varchar(150) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "productores_identificacion_unique" UNIQUE("identificacion")
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "productos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"codigo" varchar(100) NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"descripcion" text,
	"precio_referencia" numeric(14, 2),
	"unidad_comercial" varchar(50),
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "productos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"nombre" varchar(100) NOT NULL,
	"descripcion" varchar(255),
	CONSTRAINT "roles_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "transformacion_lotes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transformacion_lotes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"transformacion_id" bigint NOT NULL,
	"lote_id" bigint NOT NULL,
	"tipo_participacion" varchar(100) NOT NULL,
	"cantidad" numeric(14, 3) NOT NULL,
	"unidad" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transformaciones" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transformaciones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"codigo" varchar(100) NOT NULL,
	"etapa" varchar(100) NOT NULL,
	"responsable_id" bigint NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"observaciones" text,
	"estado" varchar(50) NOT NULL,
	"clave_idempotencia" varchar(255),
	CONSTRAINT "transformaciones_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "transformaciones_clave_idempotencia_unique" UNIQUE("clave_idempotencia")
);
--> statement-breakpoint
CREATE TABLE "usuario_roles" (
	"usuario_id" bigint NOT NULL,
	"rol_id" bigint NOT NULL,
	"asignado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_roles_usuario_id_rol_id_pk" PRIMARY KEY("usuario_id","rol_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "usuarios_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"nombre" varchar(200) NOT NULL,
	"correo" varchar(320) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_correo_unique" UNIQUE("correo")
);
--> statement-breakpoint
ALTER TABLE "auditoria_eventos" ADD CONSTRAINT "auditoria_eventos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costos_transformacion" ADD CONSTRAINT "costos_transformacion_transformacion_id_transformaciones_id_fk" FOREIGN KEY ("transformacion_id") REFERENCES "public"."transformaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_transformacion_id_transformaciones_id_fk" FOREIGN KEY ("transformacion_id") REFERENCES "public"."transformaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_productor_id_productores_id_fk" FOREIGN KEY ("productor_id") REFERENCES "public"."productores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_transformacion_id_transformaciones_id_fk" FOREIGN KEY ("transformacion_id") REFERENCES "public"."transformaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transformacion_lotes" ADD CONSTRAINT "transformacion_lotes_transformacion_id_transformaciones_id_fk" FOREIGN KEY ("transformacion_id") REFERENCES "public"."transformaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transformacion_lotes" ADD CONSTRAINT "transformacion_lotes_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transformaciones" ADD CONSTRAINT "transformaciones_responsable_id_usuarios_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_roles" ADD CONSTRAINT "usuario_roles_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_roles" ADD CONSTRAINT "usuario_roles_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_eventos_usuario_id_idx" ON "auditoria_eventos" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "costos_transformacion_transformacion_id_idx" ON "costos_transformacion" USING btree ("transformacion_id");--> statement-breakpoint
CREATE INDEX "historial_estados_lote_id_idx" ON "historial_estados" USING btree ("lote_id");--> statement-breakpoint
CREATE INDEX "historial_estados_usuario_id_idx" ON "historial_estados" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "incidencias_lote_id_idx" ON "incidencias" USING btree ("lote_id");--> statement-breakpoint
CREATE INDEX "incidencias_transformacion_id_idx" ON "incidencias" USING btree ("transformacion_id");--> statement-breakpoint
CREATE INDEX "incidencias_usuario_id_idx" ON "incidencias" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "lotes_productor_id_idx" ON "lotes" USING btree ("productor_id");--> statement-breakpoint
CREATE INDEX "movimientos_inventario_lote_id_idx" ON "movimientos_inventario" USING btree ("lote_id");--> statement-breakpoint
CREATE INDEX "movimientos_inventario_usuario_id_idx" ON "movimientos_inventario" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "transformacion_lotes_transformacion_id_idx" ON "transformacion_lotes" USING btree ("transformacion_id");--> statement-breakpoint
CREATE INDEX "transformacion_lotes_lote_id_idx" ON "transformacion_lotes" USING btree ("lote_id");