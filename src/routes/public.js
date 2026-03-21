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
    const result = await pool.query(`
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
      ORDER BY p.featured DESC, p.created_at DESC
    `);

    res.render('products', {
      title: 'Daphné | Productos',
      products: result.rows,
      filters: {},
      categories: [],
      colors: [],
      sizes: []
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
    const productId = Number(req.body.productId);
    const variantId = Number(req.body.variantId);
    const qty = Math.max(1, Number(req.body.quantity || 1));

    const variantResult = await pool.query(
      'SELECT * FROM product_variants WHERE id = $1',
      [variantId]
    );

    const variant = variantResult.rows[0];

    if (!variant || variant.stock < qty) {
      return res.redirect('/productos');
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

router.post('/carrito/eliminar', async (req, res) => {
  const { itemId } = req.body;
  await cartService.removeItem(req.sessionID, itemId);
  res.redirect('/carrito');
});

router.post('/carrito/finalizar-whatsapp', async (req, res, next) => {
  const client = await pool.connect();

  try {
    const items = await cartService.getItems(req.sessionID);

    if (!items.length) return res.redirect('/carrito');

    const customerName = (req.body.customer_name || '').trim();
    const customerPhone = (req.body.customer_phone || '').trim();
    const notes = (req.body.notes || '').trim();

    await client.query('BEGIN');

    for (const item of items) {
      const variantResult = await client.query(
        `SELECT * FROM product_variants WHERE id = (
          SELECT variant_id FROM cart_items WHERE id = $1
        )`,
        [item.id]
      );

      const variant = variantResult.rows[0];

      if (!variant || variant.stock < item.quantity) {
        throw new Error('Stock insuficiente');
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
      const variantResult = await client.query(
        `SELECT * FROM product_variants WHERE id = (
          SELECT variant_id FROM cart_items WHERE id = $1
        )`,
        [item.id]
      );

      const variant = variantResult.rows[0];

      await client.query(
        `INSERT INTO order_items
         (order_id, product_id, variant_id, product_name, color_name, size_name, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          order.id,
          variant.product_id,
          variant.id,
          item.name,
          variant.color_name,
          variant.size_name,
          item.quantity,
          item.price,
          Number(item.price) * Number(item.quantity)
        ]
      );

      await client.query(
        `UPDATE product_variants
         SET stock = stock - $1
         WHERE id = $2`,
        [item.quantity, variant.id]
      );

      await updateProductStock(variant.product_id);
    }

    await client.query('COMMIT');

    await pool.query(
      `DELETE FROM cart_items WHERE cart_id = (
        SELECT id FROM carts WHERE session_id = $1
      )`,
      [req.sessionID]
    );

    const message = `Pedido #${order.id} - ${customerName}`;

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

router.get('/carrito/vaciar', async (req, res) => {
  await pool.query(
    `DELETE FROM cart_items WHERE cart_id = (
      SELECT id FROM carts WHERE session_id = $1
    )`,
    [req.sessionID]
  );

  res.redirect('/carrito');
});

module.exports = router;