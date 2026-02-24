// src/routes/import.js — Import recipe from URL

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { importFromUrl } = require('../services/recipeImporter');

router.use(authenticate);

// POST /import/url
router.post('/url', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    let parsed;
    try { parsed = new URL(url); } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only HTTP/HTTPS URLs allowed' });
    }

    const recipe = await importFromUrl(url);
    res.json({ recipe });
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      return res.status(422).json({ error: 'Could not fetch the URL. Check that it is accessible.' });
    }
    next(err);
  }
});

module.exports = router;
