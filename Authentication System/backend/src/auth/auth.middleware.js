const { verifyToken, extractToken } = require('./tokens');

/** Resolve a request to { user, claims } or throw an Error with .status and .publicMessage. */
function authenticate(db, req) {
  const token = extractToken(req);
  if (!token) throw Object.assign(new Error('no token'), { status: 401, publicMessage: 'Authentication required.' });

  let claims;
  try {
    claims = verifyToken(token);
  } catch (e) {
    const expired = e.name === 'TokenExpiredError';
    throw Object.assign(e, { status: 401, publicMessage: expired ? 'Session expired. Please log in again.' : 'Invalid session. Please log in again.' });
  }

  // Logged-out tokens are rejected even though their signature is still valid
  if (db.prepare('SELECT 1 FROM revoked_tokens WHERE jti = ?').get(claims.jti)) {
    throw Object.assign(new Error('revoked'), { status: 401, publicMessage: 'Session has ended. Please log in again.' });
  }

  // Re-check the user still exists (e.g. account deleted after token was issued)
  const user = db.prepare('SELECT id, email, username, created_at FROM users WHERE id = ?').get(Number(claims.sub));
  if (!user) throw Object.assign(new Error('no user'), { status: 401, publicMessage: 'Invalid session. Please log in again.' });

  return { user, claims };
}

/** API middleware: 401 JSON when not logged in. */
function requireAuth(db) {
  return (req, res, next) => {
    try {
      const { user, claims } = authenticate(db, req);
      req.user = user;
      req.token = claims;
      next();
    } catch (e) {
      res.set('Cache-Control', 'no-store').status(e.status || 401).json({ error: e.publicMessage || 'Authentication required.' });
    }
  };
}

/** Page middleware: redirect to the login page when not logged in. */
function requireAuthPage(db) {
  return (req, res, next) => {
    try {
      const { user, claims } = authenticate(db, req);
      req.user = user;
      req.token = claims;
      next();
    } catch (_e) {
      res.set('Cache-Control', 'no-store').redirect('/login.html');
    }
  };
}

module.exports = { requireAuth, requireAuthPage, authenticate };
