const express = require('express');
const pool = require('../config/db');
const upload = require('../middleware/upload');
const { requireAdmin } = require('../middleware/auth');
const { makeSlug, parseCSV } = require('../utils/format');
const updateProductStock = require('../utils/updateProductStock');

const router = express.Router();

function parseVariantsText(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [colorNameRaw, sizeNameRaw, stockRaw] = line.split('|').map((v) => String(v || '').trim());

      return {
        color_name: colorNameRaw,
        size_name: sizeNameRaw,
        stock: Math.max(0, Number(stockRaw || 0))
      };
    })
    .filter((item) => item.color_name && item.size_name);
}

async function replaceProductRelationsAndVariants(productId, variants, imagePaths) {
  await pool.query('DELETE FROM product_sizes WHERE product_id = $1', [productId]);
  await pool.query('DELETE FROM product_colors WHERE product_id = $1', [productId]);
  await pool.query('DELETE FROM product_variants WHERE product_id = $1', [productId]);

  const uniqueSizes = [...new Set(variants.map((v) => v.size_name))];
  const uniqueColors = [...new Set(variants.map((v) => v.color_name))];

  for (const size of uniqueSizes) {
    await pool.query(
      'INSERT INTO product_sizes (product_id, size_name) VALUES ($1, $2)',
      [productId, size]
    );
  }

  for (const color of uniqueColors) {
    await pool.query(
      'INSERT INTO product_colors (product_id, color_name) VALUES ($1, $2)',
      [productId, color]
    );
  }

  for (const variant of variants) {
    await pool.query(
      `INSERT INTO product_variants (product_id, color_name, size_name, stock)
       VALUES ($1, $2, $3, $4)`,
      [productId, variant.color_name, variant.size_name, variant.stock]
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

  await updateProductStock(productId);
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
    product: {
      name: '',
      description: '',
      price: '',
      category: '',
      stock: 0,
      status: 'in_stock',
      size_chart_html: '',
      featured: false,
      images: [],
      variantsText: ''
    }
  });
});

router.post('/productos', requireAdmin, upload.array('images', 10), async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      category,
      status,
      size_chart_html,
      featured,
      variants_text
    } = req.body;

    const slug = makeSlug(name);
    const imagePaths = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const variants = parseVariantsText(variants_text);

    const totalStock = variants.reduce((acc, item) => acc + Number(item.stock || 0), 0);

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
        totalStock,
        status,
        size_chart_html || '',
        featured === 'on'
      ]
    );

    await replaceProductRelationsAndVariants(
      result.rows[0].id,
      variants,
      imagePaths
    );

    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

router.get('/productos/:id/editar', requireAdmin, async (req, res, next) => {
  try {
    const productId = req.params.id;

    const [productResult, imagesResult, variantsResult] = await Promise.all([
      pool.query('SELECT * FROM products WHERE id = $1 LIMIT 1', [productId]),
      pool.query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order, id', [productId]),
      pool.query('SELECT * FROM product_variants WHERE product_id = $1 ORDER BY color_name, size_name', [productId])
    ]);

    const product = productResult.rows[0];
    if (!product) return res.redirect('/admin');

    product.images = imagesResult.rows;
    product.variants = variantsResult.rows;
    product.variantsText = variantsResult.rows
      .map((v) => `${v.color_name}|${v.size_name}|${v.stock}`)
      .join('\n');

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
      status,
      size_chart_html,
      featured,
      variants_text
    } = req.body;

    const slug = makeSlug(name);
    const imagePaths = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const variants = parseVariantsText(variants_text);
    const totalStock = variants.reduce((acc, item) => acc + Number(item.stock || 0), 0);

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
        totalStock,
        status,
        size_chart_html || '',
        featured === 'on',
        productId
      ]
    );

    await replaceProductRelationsAndVariants(
      productId,
      variants,
      imagePaths
    );

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

router.get('/reviews', requireAdmin, async (req, res, next) => {
  try {
    const reviews = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.render('admin/reviews', {
      title: 'Admin | Opiniones',
      reviews: reviews.rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reviews', requireAdmin, async (req, res, next) => {
  try {
    const { customer_name, comment, stars, is_active } = req.body;

    await pool.query(
      `INSERT INTO reviews (customer_name, comment, stars, is_active)
       VALUES ($1, $2, $3, $4)`,
      [customer_name, comment, stars, is_active === 'on']
    );

    res.redirect('/admin/reviews');
  } catch (error) {
    next(error);
  }
});

router.delete('/reviews/:id', requireAdmin, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    res.redirect('/admin/reviews');
  } catch (error) {
    next(error);
  }
});

router.get('/settings', requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    res.render('admin/settings', {
      title: 'Admin | Configuración',
      settings: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

router.post('/settings', requireAdmin, async (req, res, next) => {
  try {
    const {
      site_name,
      site_domain,
      whatsapp,
      email,
      hero_title,
      hero_subtitle,
      shipping_text,
      about_text
    } = req.body;

    await pool.query(
      `UPDATE settings
       SET site_name = $1,
           site_domain = $2,
           whatsapp = $3,
           email = $4,
           hero_title = $5,
           hero_subtitle = $6,
           shipping_text = $7,
           about_text = $8,
           updated_at = NOW()
       WHERE id = 1`,
      [
        site_name,
        site_domain,
        whatsapp,
        email,
        hero_title,
        hero_subtitle,
        shipping_text,
        about_text
      ]
    );

    res.redirect('/admin/settings');
  } catch (error) {
    next(error);
  }
});

router.get('/pedidos', requireAdmin, async (req, res, next) => {
  try {
    const orders = await pool.query(`
      SELECT *
      FROM orders
      ORDER BY created_at DESC
    `);

    res.render('admin/orders', {
      title: 'Admin | Pedidos',
      orders: orders.rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/pedidos/:id/estado', requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;

    await pool.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [status, req.params.id]
    );

    res.redirect('/admin/pedidos');
  } catch (error) {
    next(error);
  }
});

router.post('/pedidos/:id/eliminar', requireAdmin, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.redirect('/admin/pedidos');
  } catch (error) {
    next(error);
  }
});

module.exports = router;