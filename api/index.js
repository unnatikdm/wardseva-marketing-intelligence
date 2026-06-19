const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('../backend/db');
const routes = require('../backend/routes');

const app = express();

app.use(cors());
app.use(express.json());

// Initialize database schema on startup asynchronously
db.initDatabase()
  .then(async () => {
    const usersCount = await db.query('SELECT COUNT(*) as count FROM users');
    const count = Number(usersCount.rows[0].count) || 0;
    if (count === 0) {
      console.log('[Serverless] Database is empty. Seeding data...');
      const etl = require('../backend/etl');
      await etl.seedData();
    } else {
      console.log('[Serverless] Database already initialized and seeded.');
    }
  })
  .catch(err => console.error('Error initializing db in serverless:', err));

app.use('/api', routes);

module.exports = app;
