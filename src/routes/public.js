const express = require('express');
const pool = require('../config/db');

const router = express.Router();

async function getProductBySlug(slug) {
  const productResult = await pool.query(
    'SELECT * FROM products WHERE slug = $1 LIMIT 1',
    [slug]
  );

  const product = productResult.rows[0];
  if (!product) return null;

  const [images, sizes, colors, variants] = await Promise.all([
    pool.query(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order, id',
      [product.id]
    ),
    pool.query(
      'SELECT * FROM product_sizes WHERE product_id = $1 ORDER BY id',
      [product.id]
    ),
    pool.query(
      'SELECT * FROM product_colors WHERE product_id = $1 ORDER BY id',
      [product.id]
    ),
    pool.query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY color_name, size_name',
      [product.id]
    )
  ]);

  product.images = images.rows;
  product.sizes = sizes.rows.map((r) => r.size_name);
  product.colors = colors.rows.map((r) => r.color_name);
  product.variants = variants.rows;

  return product;
}

router.get('/', async (req, res, next) => {
  try {
    const [featured, reviews] = await Promise.all([
      pool.query(`
        SELECT p.*,
        COALESCE(
          (
            SELECT image_url
            FROM product_images pi
            WHERE pi.product_id = p.id
            ORDER BY sort_order, id
            LIMIT 1
          ),
          '/images/hero-placeholder.jpg'
        ) AS cover_image
        FROM products p
        WHERE featured = true
        ORDER BY p.created_at DESC
        LIMIT 8
      `),
      pool.query('SELECT * FROM reviews WHERE is_active = true ORDER BY created_at DESC LIMIT 6')
    ]);

    res.render('home', {
      title: 'Daphné | Inicio',
      featuredProducts: featured.rows,
      reviews: reviews.rows
    });
  } catch (error) {
    next(error);
  }
});

router.get('/productos', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const color = (req.query.color || '').trim();
    const size = (req.query.size || '').trim();
    const category = (req.query.category || '').trim();
    const status = (req.query.status || '').trim();

    const conditions = [];
    const values = [];
    let index = 1;

    if (q) {
      conditions.push(`(
        p.name ILIKE $${index}
        OR p.category ILIKE $${index}
        OR p.description ILIKE $${index}
        OR EXISTS (
          SELECT 1
          FROM product_colors pc
          WHERE pc.product_id = p.id
          AND pc.color_name ILIKE $${index}
        )
        OR EXISTS (
          SELECT 1
          FROM product_sizes ps
          WHERE ps.product_id = p.id
          AND ps.size_name ILIKE $${index}
        )
      )`);
      values.push(`%${q}%`);
      index++;
    }

    if (color) {
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM product_colors pc
          WHERE pc.product_id = p.id
          AND pc.color_name = $${index}
        )
      `);
      values.push(color);
      index++;
    }

    if (size) {
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM product_sizes ps
          WHERE ps.product_id = p.id
          AND ps.size_name = $${index}
        )
      `);
      values.push(size);
      index++;
    }

    if (category) {
      conditions.push(`p.category = $${index}`);
      values.push(category);
      index++;
    }

    if (status) {
      conditions.push(`p.status = $${index}`);
      values.push(status);
      index++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [productsResult, categoriesResult, colorsResult, sizesResult] = await Promise.all([
      pool.query(`
        SELECT
          p.*,
          COALESCE(
            (
              SELECT image_url
              FROM product_images pi
              WHERE pi.product_id = p.id
              ORDER BY pi.sort_order, pi.id
              LIMIT 1
            ),
            '/images/hero-placeholder.jpg'
          ) AS cover_image
        FROM products p
        ${whereClause}
        ORDER BY p.featured DESC, p.created_at DESC, p.name ASC
      `, values),

      pool.query(`
        SELECT DISTINCT category
        FROM products
        WHERE category IS NOT NULL AND category <> ''
        ORDER BY category
      `),

      pool.query(`
        SELECT DISTINCT color_name
        FROM product_colors
        WHERE color_name IS NOT NULL AND color_name <> ''
        ORDER BY color_name
      `),

      pool.query(`
        SELECT DISTINCT size_name
        FROM product_sizes
        WHERE size_name IS NOT NULL AND size_name <> ''
        ORDER BY size_name
      `)
    ]);

    res.render('products', {
      title: 'Daphné | Productos',
      products: productsResult.rows,
      filters: { q, color, size, category, status },
      categories: categoriesResult.rows.map((r) => r.category),
      colors: colorsResult.rows.map((r) => r.color_name),
      sizes: sizesResult.rows.map((r) => r.size_name)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/producto/:slug', async (req, res, next) => {
  try {
    const product = await getProductBySlug(req.params.slug);

    if (!product) {
      return res.status(404).render('404', { title: 'Producto no encontrado' });
    }

    res.render('product-detail', {
      title: `Daphné | ${product.name}`,
      product
    });
  } catch (error) {
    next(error);
  }
});

router.post('/carrito/agregar', async (req, res, next) => {
  try {
    const rawProductId = Array.isArray(req.body.productId) ? req.body.productId[0] : req.body.productId;
    const rawVariantId = Array.isArray(req.body.variantId) ? req.body.variantId[0] : req.body.variantId;
    const rawQuantity = Array.isArray(req.body.quantity) ? req.body.quantity[0] : req.body.quantity;

    const productId = Number(rawProductId);
    const variantId = Number(rawVariantId);
    const qty = Math.max(1, Number(rawQuantity || 1));

    if (!Number.isInteger(productId) || !Number.isInteger(variantId)) {
      return res.redirect('/productos');
    }

    const productResult = await pool.query(
      'SELECT * FROM products WHERE id = $1 LIMIT 1',
      [productId]
    );
    const product = productResult.rows[0];

    if (!product) {
      return res.redirect('/productos');
    }

    const variantResult = await pool.query(
      'SELECT * FROM product_variants WHERE id = $1 AND product_id = $2 LIMIT 1',
      [variantId, productId]
    );
    const variant = variantResult.rows[0];

    if (!variant) {
      return res.redirect(`/producto/${product.slug}`);
    }

    if (variant.stock < qty) {
      return res.redirect(`/producto/${product.slug}`);
    }

    if (!req.session.cart) {
      req.session.cart = { items: [] };
    }

    const existing = req.session.cart.items.find(
      (item) => item.variantId === variant.id
    );

    if (existing) {
      if (existing.quantity + qty > variant.stock) {
        return res.redirect(`/producto/${product.slug}`);
      }
      existing.quantity += qty;
    } else {
      req.session.cart.items.push({
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price),
        quantity: qty,
        size: variant.size_name,
        color: variant.color_name
      });
    }

    res.redirect('/carrito');
  } catch (error) {
    next(error);
  }
});

router.get('/carrito', (req, res, next) => {
  try {
    const cart = req.session.cart || { items: [] };

    res.render('cart', {
      title: 'Daphné | Carrito',
      cart
    });
  } catch (error) {
    next(error);
  }
});

router.post('/carrito/actualizar', (req, res) => {
  const { index, quantity } = req.body;

  if (req.session.cart?.items?.[index]) {
    req.session.cart.items[index].quantity = Math.max(1, Number(quantity));
  }

  res.redirect('/carrito');
});

router.post('/carrito/eliminar', (req, res) => {
  const { index } = req.body;

  if (req.session.cart?.items) {
    req.session.cart.items.splice(Number(index), 1);
  }

  res.redirect('/carrito');
});

router.post('/carrito/finalizar-whatsapp', async (req, res, next) => {
  try {
    const cart = req.session.cart || { items: [] };
    const customerName = (req.body.customer_name || '').trim();
    const customerPhone = (req.body.customer_phone || '').trim();
    const notes = (req.body.notes || '').trim();

    if (!customerName || !cart.items || !cart.items.length) {
      return res.redirect('/carrito');
    }

    const total = cart.items.reduce(
      (acc, item) => acc + (Number(item.price) * Number(item.quantity)),
      0
    );

    const orderResult = await pool.query(
      `INSERT INTO orders (customer_name, customer_phone, status, total, notes, updated_at)
       VALUES ($1, $2, 'pending', $3, $4, NOW())
       RETURNING *`,
      [customerName, customerPhone || null, total, notes || null]
    );

    const order = orderResult.rows[0];

    for (const item of cart.items) {
      await pool.query(
        `INSERT INTO order_items
         (order_id, product_id, variant_id, product_name, color_name, size_name, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          order.id,
          item.productId,
          item.variantId || null,
          item.name,
          item.color || null,
          item.size || null,
          item.quantity,
          item.price,
          Number(item.price) * Number(item.quantity)
        ]
      );
    }

    const message = [
      `Hola, quiero finalizar mi compra en Daphné.`,
      ``,
      `Pedido #${order.id}`,
      `Cliente: ${customerName}`,
      customerPhone ? `Teléfono: ${customerPhone}` : null,
      ``,
      ...cart.items.map(
        (item) =>
          `- ${item.name} | ${item.color || '-'} | ${item.size || '-'} | Cant: ${item.quantity} | ${new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 0
          }).format(Number(item.price) * Number(item.quantity))}`
      ),
      ``,
      `Total: ${new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
      }).format(total)}`,
      notes ? `` : null,
      notes ? `Observaciones: ${notes}` : null
    ].filter(Boolean).join('\n');

    const whatsapp = res.locals.site?.whatsapp || process.env.WHATSAPP_NUMBER || '';
    const waUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;

    req.session.cart = { items: [] };

    req.session.save(() => {
      res.redirect(waUrl);
    });
  } catch (error) {
    next(error);
  }
});

router.get('/carrito/vaciar', (req, res) => {
  req.session.cart = { items: [] };
  res.redirect('/carrito');
});

router.get('/contacto', (req, res) => {
  res.render('contact', {
    title: 'Daphné | Contacto'
  });
});

router.get('/envios', (req, res) => {
  res.render('shipping', {
    title: 'Daphné | Envíos'
  });
});

module.exports = router;