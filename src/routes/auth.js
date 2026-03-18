const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const router = express.Router();

router.get('/admin/login', (req, res) => {
  res.render('login', {
    title: 'Login administrador',
    error: null
  });
});

router.post('/admin/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM admins WHERE email = $1 LIMIT 1',
      [email]
    );

    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).render('login', {
        title: 'Login administrador',
        error: 'Credenciales inválidas'
      });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);

    if (!valid) {
      return res.status(401).render('login', {
        title: 'Login administrador',
        error: 'Credenciales inválidas'
      });
    }

    req.session.admin = {
      id: admin.id,
      name: admin.full_name,
      email: admin.email
    };

    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

router.post('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

module.exports = router;