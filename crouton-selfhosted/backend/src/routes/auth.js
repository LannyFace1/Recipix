// src/routes/auth.js — Register, Login, Refresh, Logout

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const db = require('../db');

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(50),
  password: z.string().min(8).max(128),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateTokens(userId) {
  const accessToken = jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: userId, jti: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
  return { accessToken, refreshToken };
}

// POST /auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    const hash = await bcrypt.hash(data.password, 12);
    const { rows } = await db.query(
      'INSERT INTO users(email, username, password_hash) VALUES($1,$2,$3) RETURNING id, email, username',
      [data.email, data.username, hash]
    );
    const user = rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token hash
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query(
      'INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES($1,$2,$3)',
      [user.id, tokenHash, expiresAt]
    );

    res.status(201).json({ user: { id: user.id, email: user.email, username: user.username }, accessToken, refreshToken });
  } catch (err) { next(err); }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const data = LoginSchema.parse(req.body);
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [data.email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user.id);
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query(
      'INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES($1,$2,$3)',
      [user.id, tokenHash, expiresAt]
    );

    res.json({ user: { id: user.id, email: user.email, username: user.username }, accessToken, refreshToken });
  } catch (err) { next(err); }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Verify token in DB
    const { rows } = await db.query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()',
      [payload.sub]
    );
    let valid = false;
    for (const row of rows) {
      if (await bcrypt.compare(refreshToken, row.token_hash)) { valid = true; break; }
    }
    if (!valid) return res.status(401).json({ error: 'Refresh token not found or expired' });

    const { accessToken, refreshToken: newRefresh } = generateTokens(payload.sub);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) { next(err); }
});

// POST /auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const payload = jwt.decode(refreshToken);
      if (payload?.sub) {
        await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [payload.sub]);
      }
    }
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
});

module.exports = router;
