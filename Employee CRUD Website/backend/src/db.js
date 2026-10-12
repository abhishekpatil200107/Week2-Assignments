const fs = require('fs');
const path = require('path');
// Built into Node.js 22.13+ (no native module to compile, nothing extra to install)
const { DatabaseSync } = require('node:sqlite');

const DB_DIR = path.join(__dirname, '..', '..', 'database');

/**
 * Open (and if needed create) the database.
 * @param {string} file  path to the .db file, or ':memory:' for tests
 * @param {boolean} seed insert sample rows when the table is empty
 */
function openDb(file = process.env.DB_FILE || path.join(DB_DIR, 'employees.db'), seed = true) {
  const db = new DatabaseSync(file);
  db.exec(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'));
  if (seed) {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM employees').get();
    if (n === 0) db.exec(fs.readFileSync(path.join(DB_DIR, 'seed.sql'), 'utf8'));
  }
  return db;
}

module.exports = { openDb };
