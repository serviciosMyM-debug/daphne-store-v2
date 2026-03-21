const express = require('express');
const pool = require('../config/db');
const cartService = require('../services/cart.service');
const updateProductStock = require('../utils/updateProductStock');

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
    const [featured, catalog, reviews] = await Promise.all([
      pool.query(`
        SELECT
          p.*,
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
        WHERE p.featured = true
          AND p.status <> 'hidden'
          AND COALESCE(p.stock, 0) > 0
        ORDER BY p.created_at DESC
        LIMIT 8
      `),
      pool.query(`
        SELECT
          p.*,
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
        WHERE p.status <> 'hidden'
          AND COALESCE(p.stock, 0) > 0
        ORDER BY p.created_at DESC
        LIMIT 8
      `),
      pool.query(`
        SELECT *
        FROM reviews
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 6
      `)
    ]);

    res.render('home', {
      title: 'Daphné | Inicio',
      featuredProducts: featured.rows,
      catalogProducts: catalog.rows,
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

    const conditions = [`p.status <> 'hidden'`];
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

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

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
        WHERE category IS NOT NULL
          AND category <> ''
          AND status <> 'hidden'
        ORDER BY category
      `),

      pool.query(`
        SELECT DISTINCT color_name
        FROM product_colors
        WHERE color_name IS NOT NULL
          AND color_name <> ''
        ORDER BY color_name
      `),

      pool.query(`
        SELECT DISTINCT size_name
        FROM product_sizes
        WHERE size_name IS NOT NULL
          AND size_name <> ''
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

    if (!product || product.status === 'hidden') {
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
    const productId = Number(req.body.productId);
    const variantId = Number(req.body.variantId);
    const qty = Math.max(1, Number(req.body.quantity || 1));

    if (!productId || !variantId) {
      return res.redirect('/productos');
    }

    const variantResult = await pool.query(
      'SELECT * FROM product_variants WHERE id = $1 AND product_id = $2 LIMIT 1',
      [variantId, productId]
    );

    const variant = variantResult.rows[0];

    if (!variant || variant.stock < qty) {
      const productResult = await pool.query(
        'SELECT slug FROM products WHERE id = $1 LIMIT 1',
        [productId]
      );
      const product = productResult.rows[0];
      return res.redirect(product ? `/producto/${product.slug}` : '/productos');
    }

    await cartService.addItem(req.sessionID, productId, variantId, qty);

    res.redirect('/carrito');
  } catch (error) {
    next(error);
  }
});

router.get('/carrito', async (req, res, next) => {
  try {
    const items = await cartService.getItems(req.sessionID);

    res.render('cart', {
      title: 'Daphné | Carrito',
      cart: { items }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/carrito/actualizar', async (req, res, next) => {
  try {
    const itemId = Number(req.body.itemId);
    const quantity = Math.max(1, Number(req.body.quantity || 1));

    const items = await cartService.getItems(req.sessionID);
    const item = items.find((row) => Number(row.id) === itemId);

    if (!item) {
      return res.redirect('/carrito');
    }

    if (quantity > Number(item.variant_stock || 0)) {
      return res.redirect('/carrito');
    }

    await cartService.updateItemQuantity(req.sessionID, itemId, quantity);

    res.redirect('/carrito');
  } catch (error) {
    next(error);
  }
});

router.post('/carrito/eliminar', async (req, res, next) => {
  try {
    const itemId = Number(req.body.itemId);

    if (itemId) {
      await cartService.removeItem(req.sessionID, itemId);
    }

    res.redirect('/carrito');
  } catch (error) {
    next(error);
  }
});

router.post('/carrito/finalizar-whatsapp', async (req, res, next) => {
  const client = await pool.connect();

  try {
    const items = await cartService.getItems(req.sessionID);

    if (!items.length) return res.redirect('/carrito');

    const customerName = (req.body.customer_name || '').trim();
    const customerPhone = (req.body.customer_phone || '').trim();
    const notes = (req.body.notes || '').trim();

    if (!customerName) {
      return res.redirect('/carrito');
    }

    await client.query('BEGIN');

    for (const item of items) {
      const variantResult = await client.query(
        'SELECT * FROM product_variants WHERE id = $1 LIMIT 1',
        [item.variant_id]
      );

      const variant = variantResult.rows[0];

      if (!variant || Number(variant.stock) < Number(item.quantity)) {
        throw new Error(`Stock insuficiente para ${item.name}`);
      }
    }

    const total = items.reduce(
      (acc, item) => acc + (Number(item.price) * Number(item.quantity)),
      0
    );

    const orderResult = await client.query(
      `INSERT INTO orders (customer_name, customer_phone, status, total, notes, updated_at)
       VALUES ($1, $2, 'pending', $3, $4, NOW())
       RETURNING *`,
      [customerName, customerPhone || null, total, notes || null]
    );

    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items
         (order_id, product_id, variant_id, product_name, color_name, size_name, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          order.id,
          item.product_id,
          item.variant_id,
          item.name,
          item.color_name || null,
          item.size_name || null,
          item.quantity,
          item.price,
          Number(item.price) * Number(item.quantity)
        ]
      );

      await client.query(
        `UPDATE product_variants
         SET stock = stock - $1
         WHERE id = $2`,
        [item.quantity, item.variant_id]
      );

      await updateProductStock(item.product_id);
    }

    await client.query('COMMIT');

    await cartService.clearCart(req.sessionID);

    const message = [
      `Hola, quiero finalizar mi compra en Daphné.`,
      ``,
      `Pedido #${order.id}`,
      `Cliente: ${customerName}`,
      customerPhone ? `Teléfono: ${customerPhone}` : null,
      ``,
      ...items.map(
        (item) =>
          `- ${item.name} | ${item.color_name || '-'} | ${item.size_name || '-'} | Cant: ${item.quantity} | ${new Intl.NumberFormat('es-AR', {
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

    res.redirect(waUrl);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.redirect('/carrito');
  } finally {
    client.release();
  }
});

router.get('/carrito/vaciar', async (req, res, next) => {
  try {
    await cartService.clearCart(req.sessionID);
    res.redirect('/carrito');
  } catch (error) {
    next(error);
  }
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