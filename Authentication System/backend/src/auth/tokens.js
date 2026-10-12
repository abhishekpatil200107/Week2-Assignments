const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

const COOKIE_NAME = 'token';
const ALG = 'HS256';

function signToken(user) {
  return jwt.sign({ username: user.username }, config.jwtSecret, {
    algorithm: ALG,
    subject: String(user.id),
    jwtid: crypto.randomUUID(),       // unique id, lets us revoke this exact token on logout
    expiresIn: config.jwtExpiresIn,
  });
}

/** Throws JsonWebTokenError / TokenExpiredError. The algorithm is pinned, so "alg: none" tokens are rejected. */
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: [ALG] });
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,                      // JavaScript in the page can never read the token (blocks XSS theft)
    sameSite: 'strict',                  // not sent on cross-site requests (blocks CSRF)
    secure: config.isProd,               // HTTPS only in production
    path: '/',
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}

/**
 * Pull the token from an explicit `Authorization: Bearer` header (Postman/curl/API clients) first,
 * otherwise from the HttpOnly cookie used by the browser app. An explicit header always wins.
 */
function extractToken(req) {
  const h = req.headers.authorization;
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7).trim();
  if (req.cookies && typeof req.cookies[COOKIE_NAME] === 'string') return req.cookies[COOKIE_NAME];
  return null;
}

module.exports = { COOKIE_NAME, signToken, verifyToken, cookieOptions, extractToken };
