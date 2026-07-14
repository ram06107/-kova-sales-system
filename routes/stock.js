const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const stock = await db.stock.getAll();
  const totalRemaining = await db.stock.totalRemaining();
  const totalStocked = await db.stock.totalStocked();
  res.render('stock', { stock, totalRemaining, totalStocked, user: req.session });
});

router.post('/add', async (req, res) => {
  const cups = parseInt(req.body.cups) || 50;
  await db.stock.addContainer(req.session.userId, cups);
  await db.activity.log(req.session.userId, 'added_stock', 'Added ' + cups + ' cups of yogurt stock');
  return res.redirect('/stock');
});

router.get('/edit/:id', async (req, res) => {
  if (req.session.role !== 'admin') return res.redirect('/stock');
  const stock = await db.stock.getAll();
  const item = stock.find(s => s.id === parseInt(req.params.id));
  if (!item) return res.redirect('/stock');
  const totalRemaining = await db.stock.totalRemaining();
  const totalStocked = await db.stock.totalStocked();
  res.render('stock', { stock, totalRemaining, totalStocked, user: req.session, editItem: item });
});

router.post('/edit/:id', async (req, res) => {
  if (req.session.role !== 'admin') return res.redirect('/stock');
  const id = parseInt(req.params.id);
  const { total_cups, remaining_cups } = req.body;
  await db.stock.update(id, { total_cups: parseInt(total_cups), remaining_cups: parseInt(remaining_cups) });
  await db.activity.log(req.session.userId, 'edited_stock', 'Edited stock container #' + id);
  return res.redirect('/stock');
});

router.post('/delete/:id', async (req, res) => {
  if (req.session.role !== 'admin') return res.redirect('/stock');
  const id = parseInt(req.params.id);
  await db.stock.delete(id);
  await db.activity.log(req.session.userId, 'deleted_stock', 'Deleted stock container #' + id);
  return res.redirect('/stock');
});

module.exports = router;
