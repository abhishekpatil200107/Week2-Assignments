const { openDb } = require('./src/db');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;
const app = createApp(openDb());
app.listen(PORT, () => console.log(`Employee Management System running at http://localhost:${PORT}`));
