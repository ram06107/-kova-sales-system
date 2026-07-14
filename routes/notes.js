const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const notes = await db.notes.getAll(100);
  res.render('notes', { notes, user: req.session });
});

router.post('/add', async (req, res) => {
  const { title, content, note_date } = req.body;
  if (!title || !content) {
    const notes = await db.notes.getAll(100);
    return res.render('notes', { notes, user: req.session, error: 'Title and content are required' });
  }
  await db.notes.create(req.session.userId, title, content, note_date || new Date().toISOString().slice(0, 10));
  await db.activity.log(req.session.userId, 'posted_note', 'Posted: ' + title);
  return res.redirect('/notes');
});

router.post('/delete/:id', async (req, res) => {
  const note = (await db.notes.getAll(200)).find(n => n.id === parseInt(req.params.id));
  if (note && (note.user_id === req.session.userId || req.session.role === 'admin')) {
    await db.notes.delete(parseInt(req.params.id));
  }
  return res.redirect('/notes');
});

module.exports = router;
