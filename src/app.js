const path = require('path');
const express = require('express');
const methodOverride = require('method-override');
const compression = require('compression');

const sessionMiddleware = require('./config/session');
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { formatCurrency } = require('./utils/format');
const pool = require('./config/db');

const app = express();

app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src/views'));

app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use('/css', express.static(path.join(process.cwd(), 'public/css')));
app.use('/js', express.static(path.join(process.cwd(), 'public/js')));
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
app.use('/images', express.static(path.join(process.cwd(), 'public/images')));
app.use('/stock', express.static(path.join(process.cwd(), 'public/stock')));

app.use(sessionMiddleware);

app.use(async (req, res, next) => {
  try {
    const settingsResult = await pool.query('SELECT * FROM settings WHERE id = 1 LIMIT 1');
    const site = settingsResult.rows[0] || {};

    const cart = req.session.cart || { items: [] };
    const cartTotal = (cart.items || []).reduce(
      (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );

    res.locals.site = site;
    res.locals.currentPath = req.path;
    res.locals.cart = cart;
    res.locals.cartTotal = cartTotal;
    res.locals.formatCurrency = formatCurrency;
    res.locals.admin = req.session.admin || null;

    next();
  } catch (error) {
    next(error);
  }
});

app.use('/', publicRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página no encontrada'
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).send('Error interno del servidor');
});

module.exports = app;