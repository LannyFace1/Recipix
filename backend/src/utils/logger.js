// src/utils/logger.js — Structured logger (no sensitive data)
const pino = require('pino');

module.exports = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});
