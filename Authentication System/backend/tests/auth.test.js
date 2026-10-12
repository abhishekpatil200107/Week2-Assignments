process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.BCRYPT_COST = '4';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const { createApp } = require('../src/app');

const SECRET = process.env.JWT_SECRET;
const user = { email: 'Alice@Example.com', username: 'alice_01', password: 'Sup3rSecret' };

let db, app;
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8'));
  app = createApp(db, { bcryptCost: 4, rateLimit: false });
});

const register = (body = user) => request(app).post('/api/auth/register').send(body);
const login = (body) => request(app).post('/api/auth/login').send(body);
const cookieOf = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('token='));
const tokenFrom = (res) => cookieOf(res).split(';')[0].slice('token='.length);

describe('Registration', () => {
  test('creates a user, returns 201, never returns the password or hash', async () => {
    const r = await register();
    expect(r.status).toBe(201);
    expect(r.body.user).toMatchObject({ email: 'alice@example.com', username: 'alice_01' });
    expect(JSON.stringify(r.body)).not.toMatch(/password|hash|\$2/i);
  });

  test('stores a bcrypt hash, not the plain password', async () => {
    await register();
    const row = db.prepare('SELECT password_hash FROM users').get();
    expect(row.password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(row.password_hash).not.toContain(user.password);
  });

  test('same password hashes differently for two users (unique salts)', async () => {
    await register();
    await register({ email: 'bob@example.com', username: 'bob_02', password: user.password });
    const [a, b] = db.prepare('SELECT password_hash FROM users ORDER BY id').all();
    expect(a.password_hash).not.toBe(b.password_hash);
  });

  test('rejects duplicate email (case-insensitive) with 409', async () => {
    await register();
    const r = await register({ ...user, email: 'ALICE@example.COM', username: 'other_name' });
    expect(r.status).toBe(409);
    expect(r.body.details.email).toMatch(/already registered/);
  });

  test('rejects duplicate username (case-insensitive) with 409', async () => {
    await register();
    const r = await register({ ...user, email: 'new@example.com', username: 'ALICE_01' });
    expect(r.status).toBe(409);
    expect(r.body.details.username).toMatch(/taken/);
  });

  test.each([
    ['missing everything', {}, ['email', 'username', 'password']],
    ['bad email', { ...user, email: 'not-an-email' }, ['email']],
    ['short username', { ...user, username: 'ab' }, ['username']],
    ['username with symbols', { ...user, username: "bob'; DROP--" }, ['username']],
    ['short password', { ...user, password: 'a1' }, ['password']],
    ['password without number', { ...user, password: 'onlyletters' }, ['password']],
    ['password without letter', { ...user, password: '12345678' }, ['password']],
    ['password containing username', { ...user, password: 'xxalice_01xx9' }, ['password']],
    ['password over 72 bytes', { ...user, password: 'a1' + 'x'.repeat(80) }, ['password']],
    ['object instead of string (NoSQL-style payload)', { ...user, email: { $ne: '' } }, ['email']],
    ['array password', { ...user, password: ['Sup3rSecret'] }, ['password']],
  ])('validation: %s -> 400', async (_n, body, fields) => {
    const r = await register(body);
    expect(r.status).toBe(400);
    expect(Object.keys(r.body.details)).toEqual(expect.arrayContaining(fields));
    expect(db.prepare('SELECT COUNT(*) n FROM users').get().n).toBe(0);
  });

  test('malformed JSON -> 400', async () => {
    const r = await request(app).post('/api/auth/register').set('Content-Type', 'application/json').send('{oops');
    expect(r.status).toBe(400);
  });
});

describe('Login', () => {
  beforeEach(async () => { await register(); });

  test('succeeds with email (any case) and sets an HttpOnly, SameSite=Strict cookie', async () => {
    const r = await login({ email: 'ALICE@example.com', password: user.password });
    expect(r.status).toBe(200);
    const c = cookieOf(r);
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/SameSite=Strict/i);
    expect(c).toMatch(/Path=\//);
    expect(r.body.user.username).toBe('alice_01');
  });

  test('succeeds with username too', async () => {
    const r = await login({ email: 'alice_01', password: user.password });
    expect(r.status).toBe(200);
  });

  test('JWT has subject, jti, expiry and HS256', async () => {
    const r = await login({ email: user.email, password: user.password });
    const decoded = jwt.decode(tokenFrom(r), { complete: true });
    expect(decoded.header.alg).toBe('HS256');
    expect(decoded.payload.sub).toBe('1');
    expect(decoded.payload.jti).toBeDefined();
    expect(decoded.payload.exp - decoded.payload.iat).toBe(3600);
    expect(decoded.payload).not.toHaveProperty('password');
  });

  test('wrong password -> 401 generic message', async () => {
    const r = await login({ email: user.email, password: 'WrongPass1' });
    expect(r.status).toBe(401);
    expect(r.body.error).toBe('Invalid email/username or password.');
    expect(cookieOf(r)).toBeUndefined();
  });

  test('unknown user gets the exact same response as wrong password (no user enumeration)', async () => {
    const wrong = await login({ email: user.email, password: 'WrongPass1' });
    const unknown = await login({ email: 'ghost@example.com', password: 'WrongPass1' });
    expect(unknown.status).toBe(wrong.status);
    expect(unknown.body).toEqual(wrong.body);
  });

  test('missing fields -> 400', async () => {
    expect((await login({})).status).toBe(400);
    expect((await login({ email: user.email })).status).toBe(400);
  });

  test.each([
    ["' OR '1'='1", 'x'],
    ["alice_01' --", 'x'],
    [{ $gt: '' }, { $gt: '' }],
  ])('injection attempt %j does not log in', async (id, pw) => {
    const r = await login({ email: id, password: pw });
    expect([400, 401]).toContain(r.status);
    expect(cookieOf(r)).toBeUndefined();
  });
});

describe('Protected routes', () => {
  test('no token -> 401', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/dashboard')).status).toBe(401);
  });

  test('valid cookie -> 200 with user info', async () => {
    await register();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: user.password });
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ username: 'alice_01', email: 'alice@example.com' });
    expect(me.body.user).not.toHaveProperty('password_hash');
    const dash = await agent.get('/api/dashboard');
    expect(dash.status).toBe(200);
    expect(dash.body.message).toMatch(/alice_01/);
  });

  test('Bearer header works for API clients', async () => {
    await register();
    const l = await login({ email: user.email, password: user.password });
    const r = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${l.body.token}`);
    expect(r.status).toBe(200);
  });

  test('an explicit Bearer header wins over the cookie (bad Bearer + good cookie -> 401)', async () => {
    await register();
    const good = tokenFrom(await login({ email: user.email, password: user.password }));
    const r = await request(app).get('/api/auth/me').set('Cookie', `token=${good}`).set('Authorization', 'Bearer not.a.token');
    expect(r.status).toBe(401);
  });

  test('tampered token -> 401', async () => {
    await register();
    const t = tokenFrom(await login({ email: user.email, password: user.password }));
    const bad = t.slice(0, -4) + (t.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    const r = await request(app).get('/api/auth/me').set('Cookie', `token=${bad}`);
    expect(r.status).toBe(401);
  });

  test('token signed with a different secret -> 401', async () => {
    await register();
    const forged = jwt.sign({ username: 'alice_01' }, 'attacker-secret-attacker-secret-1234', { subject: '1', jwtid: 'x', expiresIn: '1h' });
    expect((await request(app).get('/api/auth/me').set('Cookie', `token=${forged}`)).status).toBe(401);
  });

  test('unsigned "alg: none" token -> 401', async () => {
    await register();
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: '1', jti: 'x', exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
    expect((await request(app).get('/api/auth/me').set('Cookie', `token=${none}`)).status).toBe(401);
  });

  test('expired token -> 401 with "expired" message', async () => {
    await register();
    const expired = jwt.sign({ username: 'alice_01' }, SECRET, { subject: '1', jwtid: 'e1', expiresIn: -10 });
    const r = await request(app).get('/api/auth/me').set('Cookie', `token=${expired}`);
    expect(r.status).toBe(401);
    expect(r.body.error).toMatch(/expired/i);
  });

  test('valid token for a deleted user -> 401', async () => {
    await register();
    const t = tokenFrom(await login({ email: user.email, password: user.password }));
    db.prepare('DELETE FROM users').run();
    expect((await request(app).get('/api/auth/me').set('Cookie', `token=${t}`)).status).toBe(401);
  });

  test('/dashboard page redirects to login when logged out, serves HTML when logged in', async () => {
    const anon = await request(app).get('/dashboard');
    expect(anon.status).toBe(302);
    expect(anon.headers.location).toBe('/login.html');
    await register();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: user.password });
    const page = await agent.get('/dashboard');
    expect(page.status).toBe(200);
    expect(page.text).toMatch(/<html/i);
  });

  test('dashboard.html is not reachable as a static file', async () => {
    const r = await request(app).get('/dashboard.html');
    expect(r.status).toBe(404);
  });
});

describe('Logout', () => {
  test('clears the cookie and invalidates the token server-side', async () => {
    await register();
    const l = await login({ email: user.email, password: user.password });
    const token = tokenFrom(l);
    expect((await request(app).get('/api/auth/me').set('Cookie', `token=${token}`)).status).toBe(200);

    const out = await request(app).post('/api/auth/logout').set('Cookie', `token=${token}`);
    expect(out.status).toBe(200);
    expect(cookieOf(out)).toMatch(/token=;/);          // cleared
    expect(db.prepare('SELECT COUNT(*) n FROM revoked_tokens').get().n).toBe(1);

    // The old token is dead even if an attacker kept a copy
    const reuse = await request(app).get('/api/auth/me').set('Cookie', `token=${token}`);
    expect(reuse.status).toBe(401);
    const reuseBearer = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(reuseBearer.status).toBe(401);
  });

  test('logging in again after logout works and issues a new, valid token', async () => {
    await register();
    const first = tokenFrom(await login({ email: user.email, password: user.password }));
    await request(app).post('/api/auth/logout').set('Cookie', `token=${first}`);
    const second = tokenFrom(await login({ email: user.email, password: user.password }));
    expect(second).not.toBe(first);
    expect((await request(app).get('/api/auth/me').set('Cookie', `token=${second}`)).status).toBe(200);
  });

  test('logout without a session is harmless (200)', async () => {
    const r = await request(app).post('/api/auth/logout');
    expect(r.status).toBe(200);
  });

  test('logout twice does not error', async () => {
    await register();
    const t = tokenFrom(await login({ email: user.email, password: user.password }));
    await request(app).post('/api/auth/logout').set('Cookie', `token=${t}`);
    expect((await request(app).post('/api/auth/logout').set('Cookie', `token=${t}`)).status).toBe(200);
  });
});

describe('Hardening', () => {
  test('security headers are set and x-powered-by is hidden', async () => {
    const r = await request(app).get('/api/auth/me');
    expect(r.headers['x-powered-by']).toBeUndefined();
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['content-security-policy']).toBeDefined();
    expect(r.headers['cache-control']).toMatch(/no-store/);
  });

  test('rate limiting blocks repeated login attempts with 429', async () => {
    const limited = createApp(db, { bcryptCost: 4, rateLimitMax: 3 });
    let last;
    for (let i = 0; i < 5; i++) last = await request(limited).post('/api/auth/login').send({ email: 'x@example.com', password: 'WrongPass1' });
    expect(last.status).toBe(429);
    expect(last.body.error).toMatch(/too many/i);
  });

  test('oversized body -> 413', async () => {
    const r = await request(app).post('/api/auth/register').send({ email: 'a@b.co', username: 'abc', password: 'x'.repeat(20000) });
    expect(r.status).toBe(413);
  });

  test('unknown API route -> JSON 404', async () => {
    const r = await request(app).get('/api/nope');
    expect(r.status).toBe(404);
    expect(r.body.error).toBeDefined();
  });
});
