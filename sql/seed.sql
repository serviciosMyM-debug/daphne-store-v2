-- Admin de ejemplo
-- Password: admin1234
-- Hash generado con scrypt y formato: scrypt$N$r$p$salt$derivedKey
INSERT INTO admins (full_name, email, password_hash)
VALUES (
  'Administrador Daphné',
  'admin@daphnestore.com.ar',
  'scrypt$16384$8$1$2b6f0f4d5e2f7a0136cd8760ef56d3f1$0d4f6f74fc6f8be4d85db0a1f71ac0d77e3d9b60ea2c5f6b61bbf98a7f54fafe783426179b0fbbe57ea3a1f8c1cf0c58d6731d450fdb607f93d3081b51518ec7'
)
ON CONFLICT (email) DO NOTHING;

UPDATE settings
SET
  site_name = 'Daphné',
  site_domain = 'daphnestore.com.ar',
  whatsapp = '5493410000000',
  email = 'hola@daphnestore.com.ar',
  instagram_url = 'https://instagram.com/daphnestore',
  hero_title = 'Elegancia femenina con identidad propia',
  hero_subtitle = 'Colecciones modernas, delicadas y premium para una experiencia de compra sofisticada.',
  about_text = 'Daphné combina sutileza, diseño y una selección cuidada de prendas femeninas para una boutique con personalidad.',
  shipping_text = 'Envíos a todo el país. Atención personalizada y seguimiento por WhatsApp.',
  contact_text = 'Estamos para asesorarte en talles, colores y disponibilidad.'
WHERE id = 1;

INSERT INTO products (name, slug, description, price, category, stock, status, size_chart_html, featured)
VALUES
(
  'Blazer Alma',
  'blazer-alma',
  'Blazer femenino de corte elegante con caída suave y terminaciones premium. Ideal para looks formales o urbanos.',
  68990,
  'Blazers',
  8,
  'in_stock',
  '<table class="size-chart"><tr><th>Talle</th><th>Busto</th><th>Cintura</th></tr><tr><td>S</td><td>88-92</td><td>68-72</td></tr><tr><td>M</td><td>93-97</td><td>73-77</td></tr><tr><td>L</td><td>98-103</td><td>78-84</td></tr></table>',
  TRUE
),
(
  'Vestido Éclat',
  'vestido-eclat',
  'Vestido delicado con silueta femenina, textura suave y detalle sofisticado para ocasiones especiales.',
  74990,
  'Vestidos',
  4,
  'sale',
  '<table class="size-chart"><tr><th>Talle</th><th>Busto</th><th>Cadera</th></tr><tr><td>S</td><td>86-90</td><td>92-96</td></tr><tr><td>M</td><td>91-96</td><td>97-102</td></tr><tr><td>L</td><td>97-102</td><td>103-108</td></tr></table>',
  TRUE
),
(
  'Camisa Lumière',
  'camisa-lumiere',
  'Camisa premium de líneas limpias, estilo boutique y terminación delicada. Un básico refinado.',
  42990,
  'Camisas',
  0,
  'out_of_stock',
  '<table class="size-chart"><tr><th>Talle</th><th>Busto</th><th>Largo</th></tr><tr><td>S</td><td>88-92</td><td>61</td></tr><tr><td>M</td><td>93-97</td><td>63</td></tr><tr><td>L</td><td>98-103</td><td>65</td></tr></table>',
  FALSE
);

INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
VALUES
(1, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80', 'Blazer Alma 1', 1),
(1, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80', 'Blazer Alma 2', 2),
(1, 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80', 'Blazer Alma 3', 3),

(2, 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80', 'Vestido Éclat 1', 1),
(2, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80', 'Vestido Éclat 2', 2),
(2, 'https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80', 'Vestido Éclat 3', 3),

(3, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', 'Camisa Lumière 1', 1),
(3, 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80', 'Camisa Lumière 2', 2);

INSERT INTO product_sizes (product_id, size_name)
VALUES
(1, 'S'), (1, 'M'), (1, 'L'),
(2, 'S'), (2, 'M'), (2, 'L'),
(3, 'S'), (3, 'M');

INSERT INTO product_colors (product_id, color_name)
VALUES
(1, 'Azul Marino'), (1, 'Crema'),
(2, 'Blanco'), (2, 'Dorado'),
(3, 'Blanco'), (3, 'Beige');

INSERT INTO reviews (customer_name, comment, stars, is_active)
VALUES
('Valentina M.', 'La calidad de la prenda superó mis expectativas. El packaging y la atención fueron impecables.', 5, TRUE),
('Camila R.', 'Me encantó el diseño de la tienda y lo fácil que fue comprar. El vestido llegó perfecto.', 5, TRUE),
('Sofía P.', 'Hermosa experiencia. Me asesoraron por WhatsApp y el talle quedó exacto.', 5, TRUE);