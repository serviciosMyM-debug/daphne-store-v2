const pool = require('../config/db');

async function getCart(sessionID) {
  let result = await pool.query(
    'SELECT * FROM carts WHERE session_id = $1',
    [sessionID]
  );

  if (!result.rows.length) {
    result = await pool.query(
      'INSERT INTO carts (session_id) VALUES ($1) RETURNING *',
      [sessionID]
    );
  }

  return result.rows[0];
}

async function getItems(sessionID) {
  const cart = await getCart(sessionID);

  const result = await pool.query(`
    SELECT 
      ci.id,
      ci.quantity,
      ci.product_id,
      ci.variant_id,
      p.name,
      p.slug,
      p.price,
      v.size_name,
      v.color_name,
      v.stock AS variant_stock
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN product_variants v ON v.id = ci.variant_id
    WHERE ci.cart_id = $1
    ORDER BY ci.id ASC
  `, [cart.id]);

  return result.rows;
}

async function getItemByVariant(sessionID, variantId) {
  const cart = await getCart(sessionID);

  const result = await pool.query(
    `SELECT *
     FROM cart_items
     WHERE cart_id = $1 AND variant_id = $2
     LIMIT 1`,
    [cart.id, variantId]
  );

  return result.rows[0] || null;
}

async function addItem(sessionID, productId, variantId, qty) {
  const cart = await getCart(sessionID);

  const existing = await pool.query(
    `SELECT *
     FROM cart_items
     WHERE cart_id = $1 AND variant_id = $2`,
    [cart.id, variantId]
  );

  if (existing.rows.length) {
    await pool.query(
      `UPDATE cart_items
       SET quantity = quantity + $1
       WHERE id = $2`,
      [qty, existing.rows[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity)
       VALUES ($1, $2, $3, $4)`,
      [cart.id, productId, variantId, qty]
    );
  }
}

async function updateItemQuantity(sessionID, itemId, qty) {
  const cart = await getCart(sessionID);

  await pool.query(
    `UPDATE cart_items
     SET quantity = $1
     WHERE id = $2 AND cart_id = $3`,
    [qty, itemId, cart.id]
  );
}

async function removeItem(sessionID, itemId) {
  const cart = await getCart(sessionID);

  await pool.query(
    `DELETE FROM cart_items
     WHERE id = $1 AND cart_id = $2`,
    [itemId, cart.id]
  );
}

async function clearCart(sessionID) {
  const cart = await getCart(sessionID);

  await pool.query(
    `DELETE FROM cart_items
     WHERE cart_id = $1`,
    [cart.id]
  );
}

module.exports = {
  getItems,
  getItemByVariant,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart
};