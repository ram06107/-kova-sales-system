const express = require('express');
const session = require('express-session');
const path = require('path');
const { db, initApp } = require('./db');
const SupabaseSessionStore = require('./session-store');

async function start() {
  await initApp();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(session({
    store: new SupabaseSessionStore(db),
    secret: process.env.SESSION_SECRET || 'kova-sales-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  }));

  app.use((req, res, next) => {
    res.locals.user = req.session;
    next();
  });

  app.use('/auth', require('./routes/auth'));
  app.use('/sales', require('./routes/sales'));
  app.use('/dashboard', require('./routes/dashboard'));
  app.use('/reports', require('./routes/reports'));
  app.use('/workers', require('./routes/workers'));
  app.use('/profile', require('./routes/profile'));
  app.use('/stock', require('./routes/stock'));
  app.use('/notes', require('./routes/notes'));

  app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
      return res.redirect('/dashboard');
    }
    return res.redirect('/auth/login');
  });

  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('<h1>Something went wrong</h1><p><a href="/auth/login">Go to Login</a></p>');
  });

  app.listen(PORT, () => {
    console.log('KOVA Sales Management System running at http://localhost:' + PORT);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
