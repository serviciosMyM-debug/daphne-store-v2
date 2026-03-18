-- Limpieza de relaciones
DELETE FROM product_images
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

DELETE FROM product_sizes
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

DELETE FROM product_colors
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

DELETE FROM products
WHERE slug IN (
  'strapless-baker',
  'sastrero-dries-lino',
  'camisa-crop-henry',
  'camisa-crop-dion',
  'chaleco-daze'
);

-- PRODUCTOS
INSERT INTO products (name, slug, description, price, category, stock, status, size_chart_html, featured)
VALUES
(
  'Strapless Baker',
  'strapless-baker',
  'Top strapless de diseño minimalista que realza la silueta con un calce cómodo y elegante. Una prenda versátil ideal para combinar con pantalones de lino, sastres o jeans para un look moderno y sofisticado.',
  16200,
  'Top',
  12,
  'in_stock',
  'S: 50cm ancho / 70cm largo<br>M: 53cm ancho / 72cm largo<br>L: 56cm ancho / 74cm largo',
  true
),
(
  'Sastrero Dries Lino',
  'sastrero-dries-lino',
  'Pantalón de lino de tiro alto y pierna amplia que brinda comodidad y elegancia. Su tono natural lo convierte en una pieza esencial para looks frescos y atemporales.',
  29990,
  'Pantalones',
  12,
  'in_stock',
  'S: 50cm ancho / 70cm largo<br>M: 53cm ancho / 72cm largo<br>L: 56cm ancho / 74cm largo',
  true
),
(
  'Camisa Crop Henry',
  'camisa-crop-henry',
  'Camisa cropped de corte relajado que combina lo clásico con un estilo contemporáneo. Ideal para usar abierta o cerrada, creando looks versátiles y modernos.',
  21800,
  'Camisas',
  6,
  'in_stock',
  'S: 50cm ancho / 70cm largo<br>M: 53cm ancho / 72cm largo<br>L: 56cm ancho / 74cm largo',
  true
),
(
  'Camisa Crop Dion',
  'camisa-crop-dion',
  'Camisa cropped con delicadas rayas verticales que aportan un estilo natural y elegante. Perfecta para combinar con prendas de lino o pantalones de corte amplio para un look fresco y moderno.',
  21800,
  'Camisas',
  6,
  'in_stock',
  'S: 50cm ancho / 70cm largo<br>M: 53cm ancho / 72cm largo<br>L: 56cm ancho / 74cm largo',
  true
),
(
  'Chaleco Daze',
  'chaleco-daze',
  'Chaleco halter con botones frontales y escote en V que aporta un estilo elegante y femenino. Perfecto para elevar cualquier outfit, combinando sofisticación y frescura en una sola prenda.',
  19990,
  'Chalecos',
  12,
  'in_stock',
  'S: 50cm ancho / 70cm largo<br>M: 53cm ancho / 72cm largo<br>L: 56cm ancho / 74cm largo',
  true
);

-- TALLES
INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'S' FROM products WHERE slug = 'strapless-baker';
INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'M' FROM products WHERE slug = 'strapless-baker';
INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'L' FROM products WHERE slug = 'strapless-baker';

INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'S' FROM products WHERE slug = 'sastrero-dries-lino';
INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'M' FROM products WHERE slug = 'sastrero-dries-lino';
INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'L' FROM products WHERE slug = 'sastrero-dries-lino';

INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'S' FROM products WHERE slug = 'camisa-crop-henry';
INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'M' FROM products WHERE slug = 'camisa-crop-henry';
INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'L' FROM products WHERE slug = 'camisa-crop-henry';

INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'S' FROM products WHERE slug = 'camisa-crop-dion';
INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'M' FROM products WHERE slug = 'camisa-crop-dion';
INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'L' FROM products WHERE slug = 'camisa-crop-dion';

INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'S' FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'M' FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_sizes (product_id, size_name)
SELECT id, 'L' FROM products WHERE slug = 'chaleco-daze';

-- COLORES
INSERT INTO product_colors (product_id, color_name)
SELECT id, 'Blanco' FROM products WHERE slug = 'strapless-baker';
INSERT INTO product_colors (product_id, color_name)
SELECT id, 'Negro' FROM products WHERE slug = 'strapless-baker';

INSERT INTO product_colors (product_id, color_name)
SELECT id, 'Beige' FROM products WHERE slug = 'sastrero-dries-lino';
INSERT INTO product_colors (product_id, color_name)
SELECT id, 'Negro' FROM products WHERE slug = 'sastrero-dries-lino';

INSERT INTO product_colors (product_id, color_name)
SELECT id, 'Blanco' FROM products WHERE slug = 'camisa-crop-henry';

INSERT INTO product_colors (product_id, color_name)
SELECT id, 'Beige' FROM products WHERE slug = 'camisa-crop-dion';

INSERT INTO product_colors (product_id, color_name)
SELECT id, 'Negro' FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_colors (product_id, color_name)
SELECT id, 'Blanco' FROM products WHERE slug = 'chaleco-daze';

-- IMÁGENES
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2305.jpeg', 'Strapless Baker', 1 FROM products WHERE slug = 'strapless-baker';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2312.jpeg', 'Strapless Baker', 2 FROM products WHERE slug = 'strapless-baker';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2298.jpeg', 'Strapless Baker', 3 FROM products WHERE slug = 'strapless-baker';

INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2258.jpeg', 'Sastrero Dries Lino', 1 FROM products WHERE slug = 'sastrero-dries-lino';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2231.jpeg', 'Sastrero Dries Lino', 2 FROM products WHERE slug = 'sastrero-dries-lino';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2284.jpeg', 'Sastrero Dries Lino', 3 FROM products WHERE slug = 'sastrero-dries-lino';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2298.jpeg', 'Sastrero Dries Lino', 4 FROM products WHERE slug = 'sastrero-dries-lino';

INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2353.jpeg', 'Camisa Crop Henry', 1 FROM products WHERE slug = 'camisa-crop-henry';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2371.jpeg', 'Camisa Crop Henry', 2 FROM products WHERE slug = 'camisa-crop-henry';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2357.jpeg', 'Camisa Crop Henry', 3 FROM products WHERE slug = 'camisa-crop-henry';

INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2325.jpeg', 'Camisa Crop Dion', 1 FROM products WHERE slug = 'camisa-crop-dion';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2273.jpeg', 'Camisa Crop Dion', 2 FROM products WHERE slug = 'camisa-crop-dion';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2323.jpeg', 'Camisa Crop Dion', 3 FROM products WHERE slug = 'camisa-crop-dion';

INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2200.jpeg', 'Chaleco Daze', 1 FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2207.jpeg', 'Chaleco Daze', 2 FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2224.jpeg', 'Chaleco Daze', 3 FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2379.jpeg', 'Chaleco Daze', 4 FROM products WHERE slug = 'chaleco-daze';
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
SELECT id, '/stock/IMG_2400.jpeg', 'Chaleco Daze', 5 FROM products WHERE slug = 'chaleco-daze';