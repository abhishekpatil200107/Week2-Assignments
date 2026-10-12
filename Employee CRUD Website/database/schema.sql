-- Employee Management System schema (SQLite)
CREATE TABLE IF NOT EXISTS employees (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  department  TEXT    NOT NULL CHECK (length(trim(department)) BETWEEN 2 AND 50),
  role        TEXT    NOT NULL CHECK (length(trim(role)) BETWEEN 2 AND 80),
  salary      REAL    NOT NULL CHECK (salary > 0 AND salary <= 100000000),
  join_date   TEXT    NOT NULL CHECK (join_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Speeds up the department filter / sort and name search
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees (department);
CREATE INDEX IF NOT EXISTS idx_employees_name       ON employees (name COLLATE NOCASE);
