// src/routes/tags.js — Tag management

const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM tags WHERE user_id=$1 ORDER BY name',
      [req.userId]
    );
    res.json({ tags: rows });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows: [tag] } = await db.query(
      `INSERT INTO tags(user_id, name, color) VALUES($1,$2,$3)
       ON CONFLICT(user_id, name) DO UPDATE SET color=$3 RETURNING *`,
      [req.userId, name.trim(), color || '#f97316']
    );
    res.status(201).json({ tag });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM tags WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
