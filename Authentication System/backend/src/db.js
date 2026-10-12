const fs = require('fs');
const path = require('path');
// Built into Node.js 22.13+, so there is no native module to compile.
const { DatabaseSync } = require('node:sqlite');

const DB_DIR = path.join(__dirname, '..', '..', 'database');

function openDb(file = process.env.DB_FILE || path.join(DB_DIR, 'auth.db')) {
  const db = new DatabaseSync(file);
  db.exec(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'));
  return db;
}

module.exports = { openDb };
