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

module.exports = router;
