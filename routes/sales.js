const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const sales = await db.sales.getAll(200);
  res.render('sales', { sales, user: req.session });
});

router.post('/add', async (req, res) => {
  const { product, quantity, unit_price, sale_date } = req.body;

  if (!product || !quantity || !unit_price || !sale_date) {
    const sales = await db.sales.getAll(200);
    return res.render('sales', { sales, user: req.session, error: 'All fields are required' });
  }

  const qty = parseInt(quantity);
  const price = parseFloat(unit_price);
  const total = qty * price;

  await db.sales.create(req.session.userId, product, qty, price, total, sale_date);

  return res.redirect('/sales');
});

router.post('/delete/:id', async (req, res) => {
  const sale = await db.sales.findById(parseInt(req.params.id));
  if (sale && (sale.user_id === req.session.userId || req.session.role === 'admin')) {
    await db.sales.delete(parseInt(req.params.id));
  }
  return res.redirect('/sales');
});

module.exports = router;
