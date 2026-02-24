// src/routes/mealplan.js — Weekly meal planner

const router = require('express').Router();
const { z } = require('zod');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const EntrySchema = z.object({
  recipe_id: z.string().uuid().nullable().optional(),
  day_of_week: z.number().int().min(0).max(6),
  meal_slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  custom_label: z.string().optional(),
  servings_override: z.coerce.number().int().min(1).optional(),
});

// GET /meal-plans/current — get current week's plan
router.get('/current', async (req, res, next) => {
  try {
    const today = new Date();
    // Monday of current week
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    monday.setHours(0,0,0,0);
    const weekStart = monday.toISOString().split('T')[0];

    const { rows: [plan] } = await db.query(
      'SELECT * FROM meal_plans WHERE user_id=$1 AND week_start=$2',
      [req.userId, weekStart]
    );

    if (!plan) return res.json({ plan: null, entries: [] });

    const { rows: entries } = await db.query(
      `SELECT mpe.*, r.title, r.photo_path, r.servings as recipe_servings, r.prep_time_minutes, r.cook_time_minutes
       FROM meal_plan_entries mpe
       LEFT JOIN recipes r ON r.id = mpe.recipe_id
       WHERE mpe.meal_plan_id = $1
       ORDER BY mpe.day_of_week, mpe.meal_slot`,
      [plan.id]
    );
    res.json({ plan, entries });
  } catch (err) { next(err); }
});

// GET /meal-plans?week_start=YYYY-MM-DD
router.get('/', async (req, res, next) => {
  try {
    const { week_start } = req.query;
    if (!week_start) return res.status(400).json({ error: 'week_start query param required' });

    const { rows: [plan] } = await db.query(
      'SELECT * FROM meal_plans WHERE user_id=$1 AND week_start=$2',
      [req.userId, week_start]
    );
    if (!plan) return res.json({ plan: null, entries: [] });

    const { rows: entries } = await db.query(
      `SELECT mpe.*, r.title, r.photo_path, r.servings as recipe_servings
       FROM meal_plan_entries mpe
       LEFT JOIN recipes r ON r.id = mpe.recipe_id
       WHERE mpe.meal_plan_id = $1
       ORDER BY mpe.day_of_week, mpe.meal_slot`,
      [plan.id]
    );
    res.json({ plan, entries });
  } catch (err) { next(err); }
});

// POST /meal-plans — create or get plan for a week
router.post('/', async (req, res, next) => {
  try {
    const { week_start } = req.body;
    if (!week_start) return res.status(400).json({ error: 'week_start required' });

    const { rows: [plan] } = await db.query(
      `INSERT INTO meal_plans(user_id, week_start) VALUES($1,$2)
       ON CONFLICT(user_id, week_start) DO UPDATE SET week_start=EXCLUDED.week_start
       RETURNING *`,
      [req.userId, week_start]
    );
    res.json({ plan });
  } catch (err) { next(err); }
});

// PUT /meal-plans/:planId/entries — upsert a single slot
router.put('/:planId/entries', async (req, res, next) => {
  try {
    // Verify plan belongs to user
    const { rows: [plan] } = await db.query(
      'SELECT id FROM meal_plans WHERE id=$1 AND user_id=$2',
      [req.params.planId, req.userId]
    );
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const data = EntrySchema.parse(req.body);

    const { rows: [entry] } = await db.query(
      `INSERT INTO meal_plan_entries(meal_plan_id, recipe_id, day_of_week, meal_slot, custom_label, servings_override)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(meal_plan_id, day_of_week, meal_slot)
       DO UPDATE SET recipe_id=$2, custom_label=$5, servings_override=$6
       RETURNING *`,
      [plan.id, data.recipe_id || null, data.day_of_week, data.meal_slot, data.custom_label, data.servings_override]
    );
    res.json({ entry });
  } catch (err) { next(err); }
});

// DELETE /meal-plans/:planId/entries/:day/:slot
router.delete('/:planId/entries/:day/:slot', async (req, res, next) => {
  try {
    await db.query(
      `DELETE FROM meal_plan_entries WHERE meal_plan_id=$1 AND day_of_week=$2 AND meal_slot=$3`,
      [req.params.planId, req.params.day, req.params.slot]
    );
    res.json({ message: 'Removed' });
  } catch (err) { next(err); }
});

module.exports = router;
