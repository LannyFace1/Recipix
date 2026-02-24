// src/index.js — Crouton Backend Entry Point

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { runMigrations } = require('./db');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security middleware ──────────────────────────────────────────────────────
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true,
}));

app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Static file serving (uploaded photos) ───────────────────────────────────
app.use('/uploads', express.static(
  process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'),
  { maxAge: '30d', immutable: true }
));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',          require('./routes/auth'));
app.use('/recipes',       require('./routes/recipes'));
app.use('/meal-plans',    require('./routes/mealplan'));
app.use('/shopping',      require('./routes/shopping'));
app.use('/tags',          require('./routes/tags'));
app.use('/import',        require('./routes/import'));
app.use('/ai',            require('./routes/ai'));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(require('./middleware/errorHandler'));

// ── Start ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    logger.info('Running database migrations...');
    await runMigrations();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Crouton backend running on port ${PORT}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
})();
