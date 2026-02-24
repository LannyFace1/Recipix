// src/middleware/errorHandler.js — Global error handler (no stack trace leaks)
const logger = require('../utils/logger');

module.exports = function errorHandler(err, req, res, next) {
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');

  // Validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation failed', details: err.errors });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 10MB)' });
  }

  // Generic
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred'
    : err.message;

  res.status(status).json({ error: message });
};
