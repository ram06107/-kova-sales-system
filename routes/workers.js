const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  const workers = await db.users.getAll();
  res.render('workers', { workers, user: req.session });
});

router.post('/add', requireAdmin, async (req, res) => {
  const { username, password, full_name } = req.body;
  if (!username || !password || !full_name) {
    const workers = await db.users.getAll();
    return res.render('workers', { workers, user: req.session, error: 'All fields are required' });
  }
  const existing = await db.users.findByUsername(username);
  if (existing) {
    const workers = await db.users.getAll();
    return res.render('workers', { workers, user: req.session, error: 'Username already taken' });
  }
  const hash = bcrypt.hashSync(password, 10);
  await db.users.create(username, hash, full_name, 'worker');
  await db.activity.log(req.session.userId, 'created_worker', 'Created worker: ' + username);
  return res.redirect('/workers');
});

router.post('/delete/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (id !== req.session.userId) {
    const u = await db.users.findById(id);
    await db.users.delete(id);
    await db.activity.log(req.session.userId, 'deleted_worker', 'Deleted worker: ' + (u ? u.username : id));
  }
  return res.redirect('/workers');
});

router.post('/reset-password/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { new_password } = req.body;
  if (new_password && new_password.length >= 6) {
    const hash = bcrypt.hashSync(new_password, 10);
    await db.users.update(id, { password: hash });
    const u = await db.users.findById(id);
    await db.activity.log(req.session.userId, 'reset_password', 'Reset password for: ' + (u ? u.username : id));
  }
  return res.redirect('/workers');
});

module.exports = router;
