const crypto = require('crypto');

const isProd = process.env.NODE_ENV === 'production';

let secret = process.env.JWT_SECRET;
if (!secret) {
  if (isProd) throw new Error('JWT_SECRET must be set in production.');
  // Development convenience: a random secret per run. Everyone is logged out on restart.
  secret = crypto.randomBytes(48).toString('hex');
  console.warn('[auth] JWT_SECRET not set - using a temporary random secret (sessions reset on restart).');
} else if (secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters.');
}

module.exports = {
  isProd,
  port: process.env.PORT || 3000,
  jwtSecret: secret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  bcryptCost: Number(process.env.BCRYPT_COST) || 12,
};
