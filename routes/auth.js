const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.users.findByUsername(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('login', { error: 'Invalid username or password' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.fullName = user.full_name;
  req.session.role = user.role;

  await db.activity.log(user.id, 'login', 'Logged in');
  return res.redirect('/dashboard');
});

router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
  const { username, password, confirm_password, full_name } = req.body;

  if (!username || !password || !full_name) {
    return res.render('register', { error: 'All fields are required' });
  }

  if (password !== confirm_password) {
    return res.render('register', { error: 'Passwords do not match' });
  }

  if (password.length < 6) {
    return res.render('register', { error: 'Password must be at least 6 characters' });
  }

  const existing = await db.users.findByUsername(username);
  if (existing) {
    return res.render('register', { error: 'Username already taken' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const newUser = await db.users.create(username, hash, full_name, 'worker');
  await db.activity.log(newUser.id, 'registered', 'New worker registered');

  return res.redirect('/auth/login');
});

router.get('/logout', (req, res) => {
  const userId = req.session.userId;
  req.session.destroy(() => {
    if (userId) db.activity.log(userId, 'logout', 'Logged out').catch(() => {});
    res.redirect('/auth/login');
  });
});

module.exports = router;
