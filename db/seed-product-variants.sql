DELETE FROM product_variants
WHERE product_id IN (
  SELECT id FROM products
  WHERE slug IN (
    'strapless-baker',
    'sastrero-dries-lino',
    'camisa-crop-henry',
    'camisa-crop-dion',
    'chaleco-daze'
  )
);

-- Strapless Baker
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Blanco', 'S', 2 FROM products WHERE slug = 'strapless-baker';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Blanco', 'M', 2 FROM products WHERE slug = 'strapless-baker';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Blanco', 'L', 2 FROM products WHERE slug = 'strapless-baker';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Negro', 'S', 2 FROM products WHERE slug = 'strapless-baker';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Negro', 'M', 2 FROM products WHERE slug = 'strapless-baker';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Negro', 'L', 2 FROM products WHERE slug = 'strapless-baker';

-- Sastrero Dries Lino
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Beige', 'S', 2 FROM products WHERE slug = 'sastrero-dries-lino';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Beige', 'M', 2 FROM products WHERE slug = 'sastrero-dries-lino';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Beige', 'L', 2 FROM products WHERE slug = 'sastrero-dries-lino';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Negro', 'S', 2 FROM products WHERE slug = 'sastrero-dries-lino';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Negro', 'M', 2 FROM products WHERE slug = 'sastrero-dries-lino';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Negro', 'L', 2 FROM products WHERE slug = 'sastrero-dries-lino';

-- Camisa Crop Henry
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Blanco', 'S', 2 FROM products WHERE slug = 'camisa-crop-henry';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Blanco', 'M', 2 FROM products WHERE slug = 'camisa-crop-henry';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Blanco', 'L', 2 FROM products WHERE slug = 'camisa-crop-henry';

-- Camisa Crop Dion
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Beige', 'S', 2 FROM products WHERE slug = 'camisa-crop-dion';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Beige', 'M', 2 FROM products WHERE slug = 'camisa-crop-dion';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Beige', 'L', 2 FROM products WHERE slug = 'camisa-crop-dion';

-- Chaleco Daze
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Negro', 'S', 2 FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Negro', 'M', 2 FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Negro', 'L', 2 FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Blanco', 'S', 2 FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Blanco', 'M', 2 FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_variants (product_id, color_name, size_name, stock)
SELECT id, 'Blanco', 'L', 2 FROM products WHERE slug = 'chaleco-daze';