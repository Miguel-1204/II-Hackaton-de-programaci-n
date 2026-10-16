UPDATE "productos" SET "imagen_url" = CASE "codigo"
  WHEN 'CHO-BLA-001' THEN 'https://images.unsplash.com/photo-1620884463224-55e55b0ae83f?auto=format&fit=crop&w=1200&q=85'
  WHEN 'CAC-POL-001' THEN 'https://nutrimart.co.za/image/cache/catalog/Coco%20Powder-400x400.png'
  WHEN 'LIC-CAC-001' THEN 'https://www.skyswancocoa.com/uploads/image/20221124/09/natural-cocoa-liquor_1669253288.jpg'
  WHEN 'CHO-NEG-001' THEN 'https://images.unsplash.com/photo-1737976685095-833ed51e7fcc?auto=format&fit=crop&w=1200&q=85'
  WHEN 'MAN-CAC-001' THEN 'https://making-tst.imgix.net/2021/06/Cocoa-butter-scaled.jpg'
  WHEN 'CHO-LEC-001' THEN 'https://images.unsplash.com/photo-1583853269692-9d0fadd59003?auto=format&fit=crop&w=1200&q=85'
  ELSE "imagen_url"
END
WHERE "codigo" IN ('CHO-BLA-001', 'CAC-POL-001', 'LIC-CAC-001', 'CHO-NEG-001', 'MAN-CAC-001', 'CHO-LEC-001');
