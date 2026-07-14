const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.render('profile', { user: req.session, error: null, success: null });
});

router.post('/change-password', async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password) {
    return res.render('profile', { user: req.session, error: 'All fields are required', success: null });
  }

  if (new_password !== confirm_password) {
    return res.render('profile', { user: req.session, error: 'New passwords do not match', success: null });
  }

  if (new_password.length < 6) {
    return res.render('profile', { user: req.session, error: 'Password must be at least 6 characters', success: null });
  }

  const user = await db.users.findById(req.session.userId);
  if (!bcrypt.compareSync(current_password, user.password)) {
    return res.render('profile', { user: req.session, error: 'Current password is incorrect', success: null });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  await db.users.update(req.session.userId, { password: hash });
  await db.activity.log(req.session.userId, 'changed_password', 'Changed own password');

  return res.render('profile', { user: req.session, error: null, success: 'Password changed successfully' });
});

module.exports = router;
