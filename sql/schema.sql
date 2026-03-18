DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS product_sizes CASCADE;
DROP TABLE IF EXISTS product_colors CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  site_name VARCHAR(120) NOT NULL DEFAULT 'Daphné',
  site_domain VARCHAR(160) NOT NULL DEFAULT 'daphnestore.com.ar',
  whatsapp VARCHAR(30) NOT NULL DEFAULT '5493410000000',
  email VARCHAR(160) NOT NULL DEFAULT 'hola@daphnestore.com.ar',
  instagram_url TEXT,
  hero_title VARCHAR(255) NOT NULL DEFAULT 'Elegancia femenina con identidad propia',
  hero_subtitle TEXT NOT NULL DEFAULT 'Descubrí prendas delicadas, modernas y premium diseñadas para resaltar tu estilo.',
  about_text TEXT NOT NULL DEFAULT 'Daphné nace como una propuesta de moda femenina boutique, con foco en elegancia, suavidad visual y una experiencia de compra refinada.',
  shipping_text TEXT NOT NULL DEFAULT 'Realizamos envíos a todo el país. Los tiempos pueden variar según destino y operador logístico.',
  contact_text TEXT NOT NULL DEFAULT 'Podés escribirnos por WhatsApp o por redes sociales para asesoramiento personalizado.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  category VARCHAR(120) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'in_stock'
    CHECK (status IN ('in_stock', 'sale', 'out_of_stock')),
  size_chart_html TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(200),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_name VARCHAR(50) NOT NULL
);

CREATE TABLE product_colors (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name VARCHAR(80) NOT NULL
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  comment TEXT NOT NULL,
  stars INTEGER NOT NULL DEFAULT 5 CHECK (stars BETWEEN 1 AND 5),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(featured);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX idx_product_colors_product_id ON product_colors(product_id);