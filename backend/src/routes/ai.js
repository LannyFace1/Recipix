// src/routes/ai.js — AI-powered meal plan generation endpoint

const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateMealPlan } = require('../services/aiPlanner');

router.use(authenticate);

// GET /ai/status — check if AI is enabled
router.get('/status', (_req, res) => {
  res.json({ enabled: Boolean(process.env.CLAUDE_API_KEY) });
});

// POST /ai/generate-meal-plan
router.post('/generate-meal-plan', async (req, res, next) => {
  try {
    if (!process.env.CLAUDE_API_KEY) {
      return res.status(503).json({
        error: 'AI meal planning is disabled. Set CLAUDE_API_KEY in your .env file to enable it.',
      });
    }

    const { week_start, days, slots, note } = req.body;
    if (!week_start) return res.status(400).json({ error: 'week_start required' });

    // Fetch user's recipes
    const { rows: recipes } = await db.query(
      `SELECT r.id, r.title, r.difficulty, r.prep_time_minutes, r.cook_time_minutes,
              COALESCE(json_agg(jsonb_build_object('name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
       FROM recipes r
       LEFT JOIN recipe_tags rt ON rt.recipe_id = r.id
       LEFT JOIN tags t ON t.id = rt.tag_id
       WHERE r.user_id = $1
       GROUP BY r.id`,
      [req.userId]
    );

    if (recipes.length === 0) {
      return res.status(400).json({ error: 'You need at least one recipe to generate a meal plan.' });
    }

    const plan = await generateMealPlan(recipes, { days, slots, note });

    // Persist: ensure meal plan exists for the week
    const { rows: [mealPlan] } = await db.query(
      `INSERT INTO meal_plans(user_id, week_start) VALUES($1,$2)
       ON CONFLICT(user_id, week_start) DO UPDATE SET week_start=EXCLUDED.week_start RETURNING *`,
      [req.userId, week_start]
    );

    // Insert entries
    for (const entry of plan) {
      await db.query(
        `INSERT INTO meal_plan_entries(meal_plan_id, recipe_id, day_of_week, meal_slot)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(meal_plan_id, day_of_week, meal_slot) DO UPDATE SET recipe_id=$2`,
        [mealPlan.id, entry.recipe_id, entry.day_of_week, entry.meal_slot]
      );
    }

    res.json({ plan: mealPlan, entries: plan, message: `Generated ${plan.length} meal plan entries.` });
  } catch (err) {
    if (err.message === 'AI_DISABLED') {
      return res.status(503).json({ error: 'AI meal planning is disabled.' });
    }
    next(err);
  }
});

module.exports = router;
