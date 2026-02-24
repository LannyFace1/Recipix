// src/routes/recipes.js — Full CRUD for recipes with photo upload

const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const fs = require('fs');

// Multer config — local storage, 10MB limit, images only
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WEBP, GIF allowed'));
  },
});

const RecipeSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  // Allow empty string for source_url (not provided)
  source_url: z.string().url().optional().or(z.literal('')),
  prep_time_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).optional()
  ),
  cook_time_minutes: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).optional()
  ),
  servings: z.coerce.number().int().min(1).default(4),
  // FIX: empty string '' from unselected <select> must be treated as undefined
  difficulty: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : v),
    z.enum(['easy', 'medium', 'hard']).optional()
  ),
  notes: z.string().optional(),
  unit_system: z.enum(['metric', 'imperial']).default('metric'),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    amount: z.coerce.number().optional(),
    unit: z.string().optional(),
    notes: z.string().optional(),
  })).default([]),
  steps: z.array(z.object({
    instruction: z.string().min(1),
    timer_seconds: z.coerce.number().int().min(0).optional(),
  })).default([]),
  tags: z.array(z.string().uuid()).default([]),
});

router.use(authenticate);

// GET /recipes — list with search & filters
router.get('/', async (req, res, next) => {
  try {
    const { search, tag, favorite, difficulty, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT r.*, 
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color)) 
          FILTER (WHERE t.id IS NOT NULL), '[]') as tags
      FROM recipes r
      LEFT JOIN recipe_tags rt ON rt.recipe_id = r.id
      LEFT JOIN tags t ON t.id = rt.tag_id
      WHERE r.user_id = $1
    `;
    const params = [req.userId];
    let idx = 2;

    if (search) { query += ` AND r.title ILIKE $${idx++}`; params.push(`%${search}%`); }
    if (favorite === 'true') { query += ` AND r.is_favorite = true`; }
    if (difficulty) { query += ` AND r.difficulty = $${idx++}`; params.push(difficulty); }
    if (tag) {
      query += ` AND r.id IN (
        SELECT recipe_id FROM recipe_tags rt2 
        JOIN tags t2 ON t2.id = rt2.tag_id 
        WHERE t2.name = $${idx++} AND t2.user_id = $1
      )`;
      params.push(tag);
    }

    query += ` GROUP BY r.id ORDER BY r.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await db.query(query, params);
    res.json({ recipes: rows });
  } catch (err) { next(err); }
});

// GET /recipes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: [recipe] } = await db.query(
      `SELECT r.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
          FILTER (WHERE t.id IS NOT NULL), '[]') as tags
       FROM recipes r
       LEFT JOIN recipe_tags rt ON rt.recipe_id = r.id
       LEFT JOIN tags t ON t.id = rt.tag_id
       WHERE r.id = $1 AND r.user_id = $2
       GROUP BY r.id`,
      [req.params.id, req.userId]
    );
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const { rows: ingredients } = await db.query(
      'SELECT * FROM ingredients WHERE recipe_id = $1 ORDER BY sort_order',
      [recipe.id]
    );
    const { rows: steps } = await db.query(
      'SELECT * FROM steps WHERE recipe_id = $1 ORDER BY sort_order',
      [recipe.id]
    );

    res.json({ recipe: { ...recipe, ingredients, steps } });
  } catch (err) { next(err); }
});

// POST /recipes
router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    const body = { ...req.body };
    // Parse JSON fields sent as form strings
    if (typeof body.ingredients === 'string') body.ingredients = JSON.parse(body.ingredients);
    if (typeof body.steps === 'string') body.steps = JSON.parse(body.steps);
    if (typeof body.tags === 'string') body.tags = JSON.parse(body.tags);

    const data = RecipeSchema.parse(body);
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

    const { rows: [recipe] } = await db.query(
      `INSERT INTO recipes(user_id, title, description, source_url, photo_path, prep_time_minutes,
        cook_time_minutes, servings, difficulty, notes, unit_system)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.userId, data.title, data.description, data.source_url || null, photoPath,
       data.prep_time_minutes ?? null, data.cook_time_minutes ?? null, data.servings,
       data.difficulty ?? null, data.notes, data.unit_system]
    );

    // Insert ingredients
    for (let i = 0; i < data.ingredients.length; i++) {
      const ing = data.ingredients[i];
      await db.query(
        'INSERT INTO ingredients(recipe_id, sort_order, name, amount, unit, notes) VALUES($1,$2,$3,$4,$5,$6)',
        [recipe.id, i, ing.name, ing.amount ?? null, ing.unit ?? null, ing.notes ?? null]
      );
    }

    // Insert steps
    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i];
      await db.query(
        'INSERT INTO steps(recipe_id, sort_order, instruction, timer_seconds) VALUES($1,$2,$3,$4)',
        [recipe.id, i, step.instruction, step.timer_seconds ?? null]
      );
    }

    // Attach tags
    for (const tagId of data.tags) {
      await db.query(
        'INSERT INTO recipe_tags(recipe_id, tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [recipe.id, tagId]
      );
    }

    res.status(201).json({ recipe });
  } catch (err) { next(err); }
});

// PUT /recipes/:id
router.put('/:id', upload.single('photo'), async (req, res, next) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM recipes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!existing) return res.status(404).json({ error: 'Recipe not found' });

    const body = { ...req.body };
    if (typeof body.ingredients === 'string') body.ingredients = JSON.parse(body.ingredients);
    if (typeof body.steps === 'string') body.steps = JSON.parse(body.steps);
    if (typeof body.tags === 'string') body.tags = JSON.parse(body.tags);

    const data = RecipeSchema.parse(body);
    const photoPath = req.file ? `/uploads/${req.file.filename}` : existing.photo_path;

    const { rows: [recipe] } = await db.query(
      `UPDATE recipes SET title=$1, description=$2, source_url=$3, photo_path=$4,
        prep_time_minutes=$5, cook_time_minutes=$6, servings=$7, difficulty=$8,
        notes=$9, unit_system=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [data.title, data.description, data.source_url || null, photoPath,
       data.prep_time_minutes ?? null, data.cook_time_minutes ?? null, data.servings,
       data.difficulty ?? null, data.notes, data.unit_system, req.params.id]
    );

    // Replace ingredients & steps
    await db.query('DELETE FROM ingredients WHERE recipe_id = $1', [recipe.id]);
    await db.query('DELETE FROM steps WHERE recipe_id = $1', [recipe.id]);

    for (let i = 0; i < data.ingredients.length; i++) {
      const ing = data.ingredients[i];
      await db.query(
        'INSERT INTO ingredients(recipe_id, sort_order, name, amount, unit, notes) VALUES($1,$2,$3,$4,$5,$6)',
        [recipe.id, i, ing.name, ing.amount ?? null, ing.unit ?? null, ing.notes ?? null]
      );
    }
    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i];
      await db.query(
        'INSERT INTO steps(recipe_id, sort_order, instruction, timer_seconds) VALUES($1,$2,$3,$4)',
        [recipe.id, i, step.instruction, step.timer_seconds ?? null]
      );
    }

    await db.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [recipe.id]);
    for (const tagId of data.tags) {
      await db.query(
        'INSERT INTO recipe_tags(recipe_id, tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [recipe.id, tagId]
      );
    }

    res.json({ recipe });
  } catch (err) { next(err); }
});

// PATCH /recipes/:id/favorite
router.patch('/:id/favorite', async (req, res, next) => {
  try {
    const { rows: [recipe] } = await db.query(
      'UPDATE recipes SET is_favorite = NOT is_favorite WHERE id=$1 AND user_id=$2 RETURNING id, is_favorite',
      [req.params.id, req.userId]
    );
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) { next(err); }
});

// DELETE /recipes/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM recipes WHERE id=$1 AND user_id=$2',
      [req.params.id, req.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Recipe not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
