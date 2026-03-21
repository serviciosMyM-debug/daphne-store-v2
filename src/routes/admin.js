const express = require('express');
const pool = require('../config/db');
const upload = require('../middleware/upload');
const { requireAdmin } = require('../middleware/auth');
const { makeSlug, parseCSV } = require('../utils/format');
const updateProductStock = require('../utils/updateProductStock');

const router = express.Router();

async function upsertRelations(productId, sizes, colors, imagePaths) {
  await pool.query('DELETE FROM product_sizes WHERE product_id = $1', [productId]);
  await pool.query('DELETE FROM product_colors WHERE product_id = $1', [productId]);

  for (const size of sizes) {
    await pool.query(
      'INSERT INTO product_sizes (product_id, size_name) VALUES ($1, $2)',
      [productId, size]
    );
  }

  for (const color of colors) {
    await pool.query(
      'INSERT INTO product_colors (product_id, color_name) VALUES ($1, $2)',
      [productId, color]
    );
  }

  if (imagePaths.length) {
    await pool.query('DELETE FROM product_images WHERE product_id = $1', [productId]);

    for (let i = 0; i < imagePaths.length; i++) {
      await pool.query(
        'INSERT INTO product_images (product_id, image_url, alt_text, sort_order) VALUES ($1, $2, $3, $4)',
        [productId, imagePaths[i], null, i + 1]
      );
    }
  }
}

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const [
      productsResult,
      reviewsResult,
      settingsResult,
      categoryStatsResult,
      statusStatsResult,
      lowStockResult,
      ordersStatsResult
    ] = await Promise.all([
      pool.query(`
        SELECT p.*,
        COALESCE(
          (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY sort_order, id LIMIT 1),
          '/images/hero-placeholder.jpg'
        ) AS cover_image
        FROM products p
        ORDER BY p.created_at DESC
      `),
      pool.query('SELECT * FROM reviews ORDER BY created_at DESC'),
      pool.query('SELECT * FROM settings WHERE id = 1'),
      pool.query(`
        SELECT category, COUNT(*)::int AS total
        FROM products
        GROUP BY category
        ORDER BY total DESC, category ASC
      `),
      pool.query(`
        SELECT status, COUNT(*)::int AS total
        FROM products
        GROUP BY status
        ORDER BY status ASC
      `),
      pool.query(`
        SELECT id, name, category, stock, status
        FROM products
        WHERE stock <= 5
        ORDER BY stock ASC, name ASC
        LIMIT 8
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_orders,
          COALESCE(SUM(total), 0)::numeric AS total_sales
        FROM orders
      `)
    ]);

    const products = productsResult.rows;
    const reviews = reviewsResult.rows;
    const settings = settingsResult.rows[0];

    const totalProducts = products.length;
    const featuredProducts = products.filter((p) => p.featured).length;
    const lowStockCount = products.filter((p) => Number(p.stock) <= 5).length;
    const soldOutCount = products.filter((p) => p.status === 'sold_out').length;
    const totalStockUnits = products.reduce((acc, p) => acc + Number(p.stock || 0), 0);
    const inventoryValue = products.reduce(
      (acc, p) => acc + Number(p.stock || 0) * Number(p.price || 0),
      0
    );

    res.render('admin/dashboard', {
      title: 'Admin | Dashboard',
      products,
      reviews,
      settings,
      stats: {
        totalProducts,
        featuredProducts,
        lowStockCount,
        soldOutCount,
        totalStockUnits,
        inventoryValue,
        totalOrders: ordersStatsResult.rows[0]?.total_orders || 0,
        totalSales: ordersStatsResult.rows[0]?.total_sales || 0
      },
      categoryStats: categoryStatsResult.rows,
      statusStats: statusStatsResult.rows,
      lowStockProducts: lowStockResult.rows
    });
  } catch (error) {
    next(error);
  }
});

router.get('/productos/nuevo', requireAdmin, (req, res) => {
  res.render('admin/product-form', {
    title: 'Admin | Nuevo producto',
    product: null
  });
});

router.post('/productos', requireAdmin, upload.array('images', 10), async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      status,
      sizes,
      colors,
      size_chart_html,
      featured
    } = req.body;

    const slug = makeSlug(name);
    const imagePaths = (req.files || []).map((file) => `/uploads/${file.filename}`);

    const result = await pool.query(
      `INSERT INTO products
      (name, slug, description, price, category, stock, status, size_chart_html, featured, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
      RETURNING *`,
      [
        name,
        slug,
        description,
        price,
        category,
        stock,
        status,
        size_chart_html || '',
        featured === 'on'
      ]
    );

    await upsertRelations(
      result.rows[0].id,
      parseCSV(sizes),
      parseCSV(colors),
      imagePaths
    );

    // 🔥 sincronizar stock con variantes
    await updateProductStock(result.rows[0].id);

    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

router.get('/productos/:id/editar', requireAdmin, async (req, res, next) => {
  try {
    const productId = req.params.id;

    const [productResult, sizesResult, colorsResult, imagesResult] = await Promise.all([
      pool.query('SELECT * FROM products WHERE id = $1 LIMIT 1', [productId]),
      pool.query('SELECT * FROM product_sizes WHERE product_id = $1 ORDER BY id', [productId]),
      pool.query('SELECT * FROM product_colors WHERE product_id = $1 ORDER BY id', [productId]),
      pool.query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order, id', [productId])
    ]);

    const product = productResult.rows[0];
    if (!product) return res.redirect('/admin');

    product.sizes = sizesResult.rows.map((r) => r.size_name);
    product.colors = colorsResult.rows.map((r) => r.color_name);
    product.images = imagesResult.rows;

    res.render('admin/product-form', {
      title: 'Admin | Editar producto',
      product
    });
  } catch (error) {
    next(error);
  }
});

router.put('/productos/:id', requireAdmin, upload.array('images', 10), async (req, res, next) => {
  try {
    const productId = req.params.id;

    const {
      name,
      description,
      price,
      category,
      stock,
      status,
      sizes,
      colors,
      size_chart_html,
      featured
    } = req.body;

    const slug = makeSlug(name);
    const imagePaths = (req.files || []).map((file) => `/uploads/${file.filename}`);

    await pool.query(
      `UPDATE products
       SET name = $1,
           slug = $2,
           description = $3,
           price = $4,
           category = $5,
           stock = $6,
           status = $7,
           size_chart_html = $8,
           featured = $9,
           updated_at = NOW()
       WHERE id = $10`,
      [
        name,
        slug,
        description,
        price,
        category,
        stock,
        status,
        size_chart_html || '',
        featured === 'on',
        productId
      ]
    );

    await upsertRelations(
      productId,
      parseCSV(sizes),
      parseCSV(colors),
      imagePaths
    );

    // 🔥 sincronizar stock con variantes
    await updateProductStock(productId);

    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

router.delete('/productos/:id', requireAdmin, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

// resto del archivo queda IGUAL (reviews, settings, pedidos...)

module.exports = router;