ALTER TABLE "lotes" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';--> statement-breakpoint
UPDATE "lotes" SET "estado" = 'PENDIENTE' WHERE "estado" = 'RECIBIDO';--> statement-breakpoint
UPDATE "lotes" SET "estado" = 'LIBERADO' WHERE "estado" = 'DISPONIBLE';--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_estado_check" CHECK ("lotes"."estado" in ('PENDIENTE', 'LIBERADO', 'BLOQUEADO'));
