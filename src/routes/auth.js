const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const router = express.Router();

router.get('/admin/login', (req, res) => {
  if (req.session.admin) {
    return res.redirect('/admin');
  }

  res.render('login', {
    title: 'Admin | Login',
    error: null
  });
});

router.post('/admin/login', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    const result = await pool.query(
      'SELECT * FROM admins WHERE email = $1 LIMIT 1',
      [email]
    );

    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).render('login', {
        title: 'Admin | Login',
        error: 'Credenciales inválidas'
      });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).render('login', {
        title: 'Admin | Login',
        error: 'Credenciales inválidas'
      });
    }

    req.session.admin = {
      id: admin.id,
      name: admin.full_name,
      email: admin.email
    };

    req.session.save((err) => {
      if (err) {
        return next(err);
      }

      return res.redirect('/admin');
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    res.clearCookie('daphne.sid');
    res.redirect('/admin/login');
  });
});

module.exports = router;