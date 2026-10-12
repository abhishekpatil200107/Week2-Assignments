const path = require('path');
const express = require('express');
const cors = require('cors');
const employeesRouter = require('./routes/employees');

function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/employees', employeesRouter(db));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Route not found.' }));

  // Serve the frontend from the same origin (no CORS setup needed in dev)
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

  // Malformed JSON and any unexpected error
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
