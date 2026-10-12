const request = require('supertest');
const { openDb } = require('../src/db');
const { createApp } = require('../src/app');

let app;
beforeEach(() => { app = createApp(openDb(':memory:', true)); });

const valid = { name: 'Test User', department: 'QA', role: 'Tester', salary: 500000, join_date: '2024-01-15' };

describe('CREATE', () => {
  test('creates an employee and returns 201 + Location', async () => {
    const r = await request(app).post('/api/employees').send(valid);
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject(valid);
    expect(r.headers.location).toBe(`/api/employees/${r.body.data.id}`);
  });
  test('trims whitespace and accepts numeric-string salary', async () => {
    const r = await request(app).post('/api/employees').send({ ...valid, name: '  Jane Doe ', salary: '650000' });
    expect(r.status).toBe(201);
    expect(r.body.data.name).toBe('Jane Doe');
    expect(r.body.data.salary).toBe(650000);
  });
  test.each([
    ['empty body', {}, ['name', 'department', 'role', 'salary', 'join_date']],
    ['short name', { name: 'A' }, ['name']],
    ['digits in name', { name: 'R2D2' }, ['name']],
    ['negative salary', { salary: -5 }, ['salary']],
    ['text salary', { salary: 'lots' }, ['salary']],
    ['bad date format', { join_date: '15/01/2024' }, ['join_date']],
    ['impossible date', { join_date: '2024-02-31' }, ['join_date']],
    ['future date', { join_date: '2999-01-01' }, ['join_date']],
  ])('rejects %s with 400', async (_t, patch, fields) => {
    const body = _t === 'empty body' ? {} : { ...valid, ...patch };
    const r = await request(app).post('/api/employees').send(body);
    expect(r.status).toBe(400);
    expect(Object.keys(r.body.details)).toEqual(expect.arrayContaining(fields));
  });
  test('rejects malformed JSON with 400', async () => {
    const r = await request(app).post('/api/employees').set('Content-Type', 'application/json').send('{bad');
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/valid JSON/);
  });
});

describe('READ', () => {
  test('lists seeded employees', async () => {
    const r = await request(app).get('/api/employees');
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(8);
  });
  test('search is case-insensitive across name/role/department', async () => {
    const r = await request(app).get('/api/employees?search=ENGINEERING');
    expect(r.body.count).toBe(3);
    const r2 = await request(app).get('/api/employees?search=priya');
    expect(r2.body.data[0].name).toBe('Priya Nair');
  });
  test('search treats % and _ literally (no wildcard injection)', async () => {
    const r = await request(app).get('/api/employees?search=%25');
    expect(r.body.count).toBe(0);
  });
  test('SQL injection attempt returns nothing and does not break', async () => {
    const r = await request(app).get("/api/employees?search=' OR 1=1 --");
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(0);
  });
  test('sorts by salary desc and rejects unknown sort columns safely', async () => {
    const r = await request(app).get('/api/employees?sort=salary&order=desc');
    const s = r.body.data.map((e) => e.salary);
    expect(s).toEqual([...s].sort((a, b) => b - a));
    const bad = await request(app).get('/api/employees?sort=id;DROP TABLE employees');
    expect(bad.status).toBe(200);
    expect((await request(app).get('/api/employees')).body.count).toBe(8);
  });
  test('gets one, 404 when missing, 400 for bad id', async () => {
    expect((await request(app).get('/api/employees/1')).body.data.id).toBe(1);
    expect((await request(app).get('/api/employees/9999')).status).toBe(404);
    expect((await request(app).get('/api/employees/abc')).status).toBe(400);
  });
});

describe('UPDATE', () => {
  test('updates and bumps updated_at', async () => {
    const r = await request(app).put('/api/employees/1').send({ ...valid, name: 'Renamed Person' });
    expect(r.status).toBe(200);
    expect(r.body.data.name).toBe('Renamed Person');
    expect((await request(app).get('/api/employees/1')).body.data.role).toBe('Tester');
  });
  test('404 for missing id, 400 for invalid data', async () => {
    expect((await request(app).put('/api/employees/9999').send(valid)).status).toBe(404);
    expect((await request(app).put('/api/employees/1').send({ ...valid, salary: 0 })).status).toBe(400);
  });
});

describe('DELETE', () => {
  test('deletes then 404s on repeat', async () => {
    expect((await request(app).delete('/api/employees/1')).status).toBe(200);
    expect((await request(app).get('/api/employees/1')).status).toBe(404);
    expect((await request(app).delete('/api/employees/1')).status).toBe(404);
    expect((await request(app).get('/api/employees')).body.count).toBe(7);
  });
});

test('unknown API route returns JSON 404', async () => {
  const r = await request(app).get('/api/nope');
  expect(r.status).toBe(404);
  expect(r.body.error).toBeDefined();
});
