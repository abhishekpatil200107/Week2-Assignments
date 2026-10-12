/**
 * Input validation + sanitisation for the auth endpoints.
 * Everything must be a string (rejects objects/arrays, which blocks NoSQL-style injection payloads),
 * is trimmed, and is checked against a whitelist pattern.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/;

const isStr = (v) => typeof v === 'string';

function validateRegister(body) {
  const b = body && typeof body === 'object' ? body : {};
  const errors = {};

  const email = isStr(b.email) ? b.email.trim().toLowerCase() : '';
  if (!email) errors.email = 'Email is required.';
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

  const username = isStr(b.username) ? b.username.trim() : '';
  if (!username) errors.username = 'Username is required.';
  else if (!USERNAME_RE.test(username)) errors.username = 'Username must be 3-30 characters: letters, numbers and underscores only.';

  const password = isStr(b.password) ? b.password : '';
  if (!password) errors.password = 'Password is required.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (Buffer.byteLength(password, 'utf8') > 72) errors.password = 'Password is too long (max 72 bytes, a bcrypt limit).';
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'Password must contain at least one letter and one number.';
  else if (username && password.toLowerCase().includes(username.toLowerCase())) errors.password = 'Password must not contain your username.';

  return { errors, value: { email, username, password } };
}

function validateLogin(body) {
  const b = body && typeof body === 'object' ? body : {};
  const errors = {};
  // "identifier" lets users sign in with either email or username
  const raw = isStr(b.email) ? b.email : isStr(b.identifier) ? b.identifier : '';
  const identifier = raw.trim().toLowerCase();
  const password = isStr(b.password) ? b.password : '';
  if (!identifier) errors.email = 'Email or username is required.';
  else if (identifier.length > 254) errors.email = 'Email or username is too long.';
  if (!password) errors.password = 'Password is required.';
  else if (Buffer.byteLength(password, 'utf8') > 72) errors.password = 'Password is too long.';
  return { errors, value: { identifier, password } };
}

module.exports = { validateRegister, validateLogin };
