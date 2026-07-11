const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const SSP = '\u20A9'; // South Sudanese Pound symbol

router.get('/', (req, res) => {
  const sales = db.prepare(`
    SELECT s.*, u.full_name
    FROM sales s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.sale_date DESC, s.created_at DESC
    LIMIT 200
  `).all();
  res.render('sales', { sales, user: req.session, currency: SSP });
});

router.post('/add', (req, res) => {
  const { product, quantity, unit_price, sale_date } = req.body;

  if (!product || !quantity || !unit_price || !sale_date) {
    const sales = db.prepare('SELECT s.*, u.full_name FROM sales s JOIN users u ON s.user_id = u.id ORDER BY s.sale_date DESC, s.created_at DESC LIMIT 200').all();
    return res.render('sales', { sales, user: req.session, currency: SSP, error: 'All fields are required' });
  }

  const qty = parseInt(quantity);
  const price = parseFloat(unit_price);
  const total = qty * price;

  db.prepare('INSERT INTO sales (user_id, product, quantity, unit_price, total_amount, sale_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.session.userId, product, qty, price, total, sale_date);

  return res.redirect('/sales');
});

router.post('/delete/:id', (req, res) => {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (sale && (sale.user_id === req.session.userId || req.session.role === 'admin')) {
    db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  }
  return res.redirect('/sales');
});

module.exports = router;
