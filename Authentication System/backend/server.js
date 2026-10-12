const config = require('./src/config');
const { openDb } = require('./src/db');
const { createApp } = require('./src/app');

const app = createApp(openDb());
app.listen(config.port, () => console.log(`Auth system running at http://localhost:${config.port}`));
