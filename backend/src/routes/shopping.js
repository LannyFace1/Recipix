// src/routes/shopping.js — Shopping list management

const router = require('express').Router();
const { z } = require('zod');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /shopping — list all shopping lists
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM shopping_lists WHERE user_id=$1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ lists: rows });
  } catch (err) { next(err); }
});

// GET /shopping/:id — get list with items
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: [list] } = await db.query(
      'SELECT * FROM shopping_lists WHERE id=$1 AND user_id=$2',
      [req.params.id, req.userId]
    );
    if (!list) return res.status(404).json({ error: 'List not found' });
    const { rows: items } = await db.query(
      'SELECT * FROM shopping_items WHERE shopping_list_id=$1 ORDER BY category, sort_order',
      [list.id]
    );
    res.json({ list: { ...list, items } });
  } catch (err) { next(err); }
});

// POST /shopping — create list (optionally from meal plan)
router.post('/', async (req, res, next) => {
  try {
    const { name, meal_plan_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const { rows: [list] } = await db.query(
      'INSERT INTO shopping_lists(user_id, name, meal_plan_id) VALUES($1,$2,$3) RETURNING *',
      [req.userId, name, meal_plan_id || null]
    );

    // If meal plan given, auto-populate from recipes
    if (meal_plan_id) {
      const { rows: ingredientRows } = await db.query(
        `SELECT i.name, i.amount, i.unit
         FROM meal_plan_entries mpe
         JOIN recipes r ON r.id = mpe.recipe_id
         JOIN ingredients i ON i.recipe_id = r.id
         WHERE mpe.meal_plan_id = $1`,
        [meal_plan_id]
      );

      // Aggregate same-name ingredients
      const grouped = {};
      for (const ing of ingredientRows) {
        const key = `${ing.name.toLowerCase()}__${ing.unit || ''}`;
        if (!grouped[key]) grouped[key] = { name: ing.name, amount: 0, unit: ing.unit };
        grouped[key].amount += parseFloat(ing.amount) || 0;
      }

      let order = 0;
      for (const item of Object.values(grouped)) {
        await db.query(
          'INSERT INTO shopping_items(shopping_list_id, name, amount, unit, sort_order) VALUES($1,$2,$3,$4,$5)',
          [list.id, item.name, item.amount || null, item.unit, order++]
        );
      }
    }

    res.status(201).json({ list });
  } catch (err) { next(err); }
});

// POST /shopping/:id/items — add item
router.post('/:id/items', async (req, res, next) => {
  try {
    const { name, amount, unit, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const { rows: [list] } = await db.query(
      'SELECT id FROM shopping_lists WHERE id=$1 AND user_id=$2',
      [req.params.id, req.userId]
    );
    if (!list) return res.status(404).json({ error: 'List not found' });

    const { rows: [item] } = await db.query(
      'INSERT INTO shopping_items(shopping_list_id, name, amount, unit, category) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [list.id, name, amount, unit, category || 'other']
    );
    res.status(201).json({ item });
  } catch (err) { next(err); }
});

// PATCH /shopping/:id/items/:itemId — toggle checked
router.patch('/:id/items/:itemId', async (req, res, next) => {
  try {
    const { is_checked } = req.body;
    const { rows: [item] } = await db.query(
      `UPDATE shopping_items si SET is_checked=$1
       FROM shopping_lists sl
       WHERE si.id=$2 AND si.shopping_list_id=sl.id AND sl.user_id=$3
       RETURNING si.*`,
      [is_checked, req.params.itemId, req.userId]
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ item });
  } catch (err) { next(err); }
});

// DELETE /shopping/:id — delete list
router.delete('/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM shopping_lists WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
