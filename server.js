const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const { db, initDB } = require('./db');
const SQLiteSessionStore = require('./session-store');

async function start() {
  await initDB();

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)').run('admin', hash, 'Administrator', 'admin');
    console.log('  Default admin account created — Username: admin / Password: admin123');
  }

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  const sessionStore = new SQLiteSessionStore(db);

  app.use(session({
    store: sessionStore,
    secret: 'kova-sales-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  }));

  app.use((req, res, next) => {
    res.locals.user = req.session;
    next();
  });

  const authRoutes = require('./routes/auth');
  const salesRoutes = require('./routes/sales');
  const dashboardRoutes = require('./routes/dashboard');
  const reportsRoutes = require('./routes/reports');

  app.use('/auth', authRoutes);
  app.use('/sales', salesRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/reports', reportsRoutes);

  app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
      return res.redirect('/dashboard');
    }
    return res.redirect('/auth/login');
  });

  app.listen(PORT, () => {
    console.log(`\n  KOVA Sales Management System running at http://localhost:${PORT}\n`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
