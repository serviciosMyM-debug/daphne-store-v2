const path = require('path');
const express = require('express');
const compression = require('compression');
const methodOverride = require('method-override');
const sessionMiddleware = require('./config/session');
const pool = require('./config/db');

const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(sessionMiddleware);

app.use('/css', express.static(path.join(process.cwd(), 'public/css')));
app.use('/js', express.static(path.join(process.cwd(), 'public/js')));
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
app.use('/images', express.static(path.join(process.cwd(), 'public/images')));
app.use('/stock', express.static(path.join(process.cwd(), 'public/stock')));

app.use(async (req, res, next) => {
  try {
    const settingsResult = await pool.query('SELECT * FROM settings WHERE id = 1');
    const settings = settingsResult.rows[0] || null;

    let cartTotal = 0;
    let cartCount = 0;

    if (!req.session.cart) {
      req.session.cart = { items: [] };
    }

    if (Array.isArray(req.session.cart.items)) {
      cartCount = req.session.cart.items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
      cartTotal = req.session.cart.items.reduce(
        (acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 0)),
        0
      );
    }

    res.locals.site = settings;
    res.locals.currentPath = req.path;
    res.locals.admin = req.session.admin || null;
    res.locals.cartTotal = cartTotal;
    res.locals.cartCount = cartCount;
    res.locals.formatCurrency = (value) =>
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
      }).format(Number(value || 0));

    next();
  } catch (error) {
    next(error);
  }
});

app.use('/', publicRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Error interno del servidor');
});

module.exports = app;