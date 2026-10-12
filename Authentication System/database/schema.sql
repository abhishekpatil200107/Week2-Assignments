-- Authentication System schema (SQLite)
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,   -- stored lower-case; unique ignoring case
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,                          -- bcrypt hash only, never the password
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- JWTs that were logged out before they expired. A token whose jti is listed here is rejected.
CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti        TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL                           -- unix seconds; rows are purged after this time
);
CREATE INDEX IF NOT EXISTS idx_revoked_expires ON revoked_tokens (expires_at);
