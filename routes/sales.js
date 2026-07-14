const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const filters = {
    product: req.query.product || '',
    user_id: req.query.user_id || '',
    date_from: req.query.date_from || '',
    date_to: req.query.date_to || ''
  };

  const hasFilter = filters.product || filters.user_id || filters.date_from || filters.date_to;
  const sales = hasFilter ? await db.sales.search(filters) : await db.sales.getAll(200);

  const workers = await db.users.getAll();
  const totals = sales.reduce((acc, s) => {
    acc.total += Number(s.total_amount);
    acc.qty += s.quantity;
    return acc;
  }, { total: 0, qty: 0 });

  let stockRemaining = 0;
  try { stockRemaining = await db.stock.totalRemaining(); } catch(e) {}

  res.render('sales', { sales, workers, filters, totals, user: req.session, stockRemaining });
});

router.get('/csv', async (req, res) => {
  const filters = {
    product: req.query.product || '',
    user_id: req.query.user_id || '',
    date_from: req.query.date_from || '',
    date_to: req.query.date_to || ''
  };
  const sales = (filters.product || filters.user_id || filters.date_from || filters.date_to)
    ? await db.sales.search(filters) : await db.sales.getAll(1000);

  let csv = 'Date,Product,Quantity,Unit Price (SSP),Total (SSP),Recorded By\n';
  sales.forEach(s => {
    csv += `${s.sale_date},${s.product},${s.quantity},${s.unit_price},${s.total_amount},"${s.full_name}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="KOVA_Sales_' + new Date().toISOString().slice(0, 10) + '.csv"');
  res.send(csv);
});

router.get('/edit/:id', async (req, res) => {
  const sale = await db.sales.findById(parseInt(req.params.id));
  if (!sale || (sale.user_id !== req.session.userId && req.session.role !== 'admin')) {
    return res.redirect('/sales');
  }
  const workers = await db.users.getAll();
  res.render('sale-edit', { sale, workers, user: req.session, error: null });
});

router.post('/edit/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const sale = await db.sales.findById(id);
  if (!sale || (sale.user_id !== req.session.userId && req.session.role !== 'admin')) {
    return res.redirect('/sales');
  }

  const { product, quantity, unit_price, sale_date } = req.body;
  const qty = parseInt(quantity);
  const price = parseFloat(unit_price);
  const total = qty * price;

  await db.sales.update(id, { product, quantity: qty, unit_price: price, total_amount: total, sale_date });
  await db.activity.log(req.session.userId, 'edited_sale', `Edited sale #${id}: ${product} x${qty}`);
  return res.redirect('/sales');
});

router.post('/add', async (req, res) => {
  const { product, quantity, unit_price, sale_date } = req.body;

  if (!product || !quantity || !unit_price || !sale_date) {
    const sales = await db.sales.getAll(200);
    const workers = await db.users.getAll();
    let stockRemaining = 0;
    try { stockRemaining = await db.stock.totalRemaining(); } catch(e) {}
    return res.render('sales', { sales, workers, filters: {}, totals: { total: 0, qty: 0 }, user: req.session, error: 'All fields are required', stockRemaining });
  }

  const qty = parseInt(quantity);
  const price = parseFloat(unit_price);
  const total = qty * price;

  await db.sales.create(req.session.userId, product, qty, price, total, sale_date);

  if (product === 'yogurt' && qty > 0) {
    const leftover = await db.stock.deductCups(qty);
    if (leftover > 0) {
      await db.activity.log(req.session.userId, 'stock_warning', 'Stock short by ' + leftover + ' cups');
    }
  }

  await db.activity.log(req.session.userId, 'added_sale', `Added ${product} x${qty} for ${total} SSP`);
  return res.redirect('/sales');
});

router.post('/delete/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const sale = await db.sales.findById(id);
  if (sale && (sale.user_id === req.session.userId || req.session.role === 'admin')) {
    if (sale.product === 'yogurt' && sale.quantity > 0) {
      await db.stock.deductCups(-sale.quantity);
    }
    await db.sales.delete(id);
    await db.activity.log(req.session.userId, 'deleted_sale', `Deleted sale #${id}`);
  }
  return res.redirect('/sales');
});

module.exports = router;
