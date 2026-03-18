const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = session({
  store: new pgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
  name: 'daphne.sid',
  secret: process.env.SESSION_SECRET || 'cambiar-esta-clave-en-produccion',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
});