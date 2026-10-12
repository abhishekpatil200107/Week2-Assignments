const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { authRouter, requireAuth, requireAuthPage } = require('./auth');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'frontend', 'public');
const VIEWS_DIR = path.join(__dirname, '..', '..', 'frontend', 'views');

function createApp(db, options = {}) {
  const app = express();
  app.disable('x-powered-by');

  const csp = helmet.contentSecurityPolicy.getDefaultDirectives();
  delete csp['upgrade-insecure-requests']; // would break plain-http localhost in some browsers
  app.use(helmet({ contentSecurityPolicy: { directives: csp } }));

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  // Auth module (register / login / logout / me)
  app.use('/api/auth', authRouter(db, options));

  // Example protected API route
  app.get('/api/dashboard', requireAuth(db), (req, res) => {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
    res.set('Cache-Control', 'no-store').json({
      message: `Welcome back, ${req.user.username}! This data is only visible to logged-in users.`,
      totalUsers: n,
    });
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Route not found.' }));

  // Protected page: the HTML itself is only sent to authenticated users, everyone else is redirected
  app.get('/dashboard', requireAuthPage(db), (_req, res) => {
    res.set('Cache-Control', 'no-store').sendFile(path.join(VIEWS_DIR, 'dashboard.html'));
  });
  app.get('/', (_req, res) => res.redirect('/dashboard'));

  app.use(express.static(PUBLIC_DIR));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large.' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  });
  return app;
}

module.exports = { createApp };
