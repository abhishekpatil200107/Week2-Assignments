const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { validateRegister, validateLogin } = require('./validation');
const { COOKIE_NAME, signToken, verifyToken, cookieOptions, extractToken } = require('./tokens');
const { requireAuth } = require('./auth.middleware');

const GENERIC_LOGIN_ERROR = 'Invalid email/username or password.';

module.exports = function authRouter(db, options = {}) {
  const router = express.Router();
  const cost = options.bcryptCost || config.bcryptCost;
  // Used to burn the same CPU time when the account does not exist (stops user enumeration by timing)
  const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', cost);

  const limiter = options.rateLimit === false ? (_q, _s, n) => n() : rateLimit({
    windowMs: options.rateLimitWindowMs || 15 * 60 * 1000,
    limit: options.rateLimitMax || 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
  });

  // Auth responses must never be cached (back button after logout, shared proxies, etc.)
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  // ---------- POST /api/auth/register ----------
  router.post('/register', limiter, async (req, res, next) => {
    try {
      const { errors, value } = validateRegister(req.body);
      if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', details: errors });

      const passwordHash = await bcrypt.hash(value.password, cost);
      try {
        const info = db.prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)')
          .run(value.email, value.username, passwordHash);
        return res.status(201).json({
          message: 'Account created. You can now log in.',
          user: { id: Number(info.lastInsertRowid), email: value.email, username: value.username },
        });
      } catch (e) {
        if (/UNIQUE constraint failed: users\.email/.test(e.message)) {
          return res.status(409).json({ error: 'That email is already registered.', details: { email: 'That email is already registered.' } });
        }
        if (/UNIQUE constraint failed: users\.username/.test(e.message)) {
          return res.status(409).json({ error: 'That username is taken.', details: { username: 'That username is taken.' } });
        }
        throw e;
      }
    } catch (e) { next(e); }
  });

  // ---------- POST /api/auth/login ----------
  router.post('/login', limiter, async (req, res, next) => {
    try {
      const { errors, value } = validateLogin(req.body);
      if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', details: errors });

      const row = db.prepare('SELECT id, email, username, password_hash FROM users WHERE email = ? OR username = ?')
        .get(value.identifier, value.identifier);

      // Always run one bcrypt comparison, whether or not the user exists
      const ok = await bcrypt.compare(value.password, row ? row.password_hash : DUMMY_HASH);
      if (!row || !ok) return res.status(401).json({ error: GENERIC_LOGIN_ERROR });

      const token = signToken(row);
      const { exp } = verifyToken(token);
      res.cookie(COOKIE_NAME, token, cookieOptions(exp * 1000 - Date.now()));
      res.json({
        message: 'Logged in.',
        user: { id: row.id, email: row.email, username: row.username },
        expiresAt: new Date(exp * 1000).toISOString(),
        // Also returned for API clients (Postman). The browser app ignores it and relies on the HttpOnly cookie.
        token,
      });
    } catch (e) { next(e); }
  });

  // ---------- POST /api/auth/logout ----------
  // Always succeeds and clears the cookie; if the token is valid it is also revoked server-side.
  router.post('/logout', (req, res) => {
    const token = extractToken(req);
    if (token) {
      try {
        const claims = verifyToken(token);
        db.prepare('INSERT OR IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)').run(claims.jti, claims.exp);
      } catch (_e) { /* expired or invalid: nothing to revoke */ }
    }
    // Housekeeping: expired tokens can never be used again, so forget them
    db.prepare('DELETE FROM revoked_tokens WHERE expires_at < ?').run(Math.floor(Date.now() / 1000));
    res.clearCookie(COOKIE_NAME, cookieOptions());
    res.json({ message: 'Logged out.' });
  });

  // ---------- GET /api/auth/me  (protected) ----------
  router.get('/me', requireAuth(db), (req, res) => {
    res.json({ user: req.user, expiresAt: new Date(req.token.exp * 1000).toISOString() });
  });

  return router;
};
