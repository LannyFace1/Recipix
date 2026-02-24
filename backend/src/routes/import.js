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
    // Network / connectivity errors — give a clear message instead of a 500
    const networkErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'ECONNABORTED', 'EHOSTUNREACH'];
    if (networkErrors.includes(err.code)) {
      return res.status(422).json({
        error: 'Could not reach the URL. Check that it is publicly accessible and try again.',
      });
    }
    // HTTP error from the target site (403 Forbidden, 404 Not Found, etc.)
    if (err.response?.status) {
      return res.status(422).json({
        error: `The website returned an error (HTTP ${err.response.status}). It may be blocking automated requests.`,
      });
    }
    // SSL / TLS errors
    if (err.code && err.code.startsWith('CERT_') || err.message?.includes('SSL') || err.message?.includes('certificate')) {
      return res.status(422).json({
        error: 'SSL certificate error when connecting to the URL.',
      });
    }
    next(err);
  }
});

module.exports = router;
