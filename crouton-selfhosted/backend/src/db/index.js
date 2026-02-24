// src/db/index.js — PostgreSQL connection pool + migration runner

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error');
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  logger.debug({ query: text, duration: Date.now() - start, rows: res.rowCount }, 'DB query');
  return res;
}

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [file]
    );
    if (rows.length === 0) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [file]);
        await client.query('COMMIT');
        logger.info(`Migration applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  }
}

module.exports = { query, pool, runMigrations };
