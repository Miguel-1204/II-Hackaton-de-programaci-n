ALTER TABLE "productos" ADD COLUMN "imagen_url" varchar(500);
--> statement-breakpoint
UPDATE "productos" SET "imagen_url" = CASE "codigo"
  WHEN 'CHO-BLA-001' THEN '/images/products/chocolate-blanco.svg'
  WHEN 'CAC-POL-001' THEN '/images/products/cacao-en-polvo.svg'
  WHEN 'LIC-CAC-001' THEN '/images/products/licor-de-cacao.svg'
  WHEN 'CHO-NEG-001' THEN '/images/products/chocolate-negro.svg'
  WHEN 'MAN-CAC-001' THEN '/images/products/manteca-de-cacao.svg'
  WHEN 'CHO-LEC-001' THEN '/images/products/chocolate-en-leche.svg'
  ELSE NULL
END;
