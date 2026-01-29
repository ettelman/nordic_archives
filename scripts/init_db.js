const { initDatabase } = require('../db/init');
const db = require('../db/db');

initDatabase()
  .then(() => {
    console.log('Database initialized successfully.');
    db.close();
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
