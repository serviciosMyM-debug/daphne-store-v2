const pool = require('../config/db');

async function updateProductStock(productId) {
  await pool.query(`
    UPDATE products
    SET stock = COALESCE((
      SELECT SUM(stock)
      FROM product_variants
      WHERE product_id = $1
    ), 0)
    WHERE id = $1
  `, [productId]);
}

module.exports = updateProductStock;