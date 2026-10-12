const express = require('express');
const { validateEmployee } = require('../validation');

const SORTABLE = ['id', 'name', 'department', 'role', 'salary', 'join_date'];

module.exports = function employeesRouter(db) {
  const router = express.Router();

  const parseId = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: 'Employee id must be a positive integer.' });
      return null;
    }
    return id;
  };

  // READ (list) - GET /api/employees?search=&department=&sort=name&order=asc
  router.get('/', (req, res) => {
    const { search = '', department = '', order = 'asc' } = req.query;
    const sort = SORTABLE.includes(req.query.sort) ? req.query.sort : 'id';
    const dir = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const where = [];
    const params = {};
    if (String(search).trim()) {
      where.push('(name LIKE @q ESCAPE \'\\\' OR role LIKE @q ESCAPE \'\\\' OR department LIKE @q ESCAPE \'\\\')');
      params.q = `%${String(search).trim().replace(/[\\%_]/g, '\\$&')}%`;
    }
    if (String(department).trim()) {
      where.push('department = @department COLLATE NOCASE');
      params.department = String(department).trim();
    }
    // `sort` and `dir` come from a whitelist, so interpolating them is safe.
    const sql = `SELECT * FROM employees ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY ${sort} ${sort === 'name' || sort === 'department' || sort === 'role' ? 'COLLATE NOCASE' : ''} ${dir}, id ASC`;
    const rows = db.prepare(sql).all(params);
    res.json({ count: rows.length, data: rows });
  });

  // READ (one)
  router.get('/:id', (req, res) => {
    const id = parseId(req, res); if (id === null) return;
    const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: `Employee ${id} not found.` });
    res.json({ data: row });
  });

  // CREATE
  router.post('/', (req, res) => {
    const { errors, value } = validateEmployee(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', details: errors });
    const info = db.prepare(
      'INSERT INTO employees (name, department, role, salary, join_date) VALUES (@name, @department, @role, @salary, @join_date)'
    ).run(value);
    const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).location(`/api/employees/${row.id}`).json({ data: row });
  });

  // UPDATE (full replace)
  router.put('/:id', (req, res) => {
    const id = parseId(req, res); if (id === null) return;
    const { errors, value } = validateEmployee(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', details: errors });
    const info = db.prepare(
      `UPDATE employees SET name=@name, department=@department, role=@role, salary=@salary,
       join_date=@join_date, updated_at=datetime('now') WHERE id=@id`
    ).run({ ...value, id });
    if (info.changes === 0) return res.status(404).json({ error: `Employee ${id} not found.` });
    res.json({ data: db.prepare('SELECT * FROM employees WHERE id = ?').get(id) });
  });

  // DELETE
  router.delete('/:id', (req, res) => {
    const id = parseId(req, res); if (id === null) return;
    const info = db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: `Employee ${id} not found.` });
    res.json({ message: `Employee ${id} deleted.` });
  });

  return router;
};
