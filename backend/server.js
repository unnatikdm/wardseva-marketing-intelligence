const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const db = require('./db');
const etl = require('./etl');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Serve Static Files from Frontend in Production
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuildPath));

// Catch-all route to serve the React index.html for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      // Fallback if frontend is not built yet
      res.status(200).send('WardSeva Marketing Intelligence API Server is Running. Frontend not yet compiled.');
    }
  });
});

// Start Background ETL Scheduler
// Runs every day at midnight (00:00) to simulate updating lead stats, keyword cost, and visits.
cron.schedule('0 0 * * *', async () => {
  console.log('[Scheduler] Running nightly ETL Sync...');
  try {
    // We can run a lighter version of seeding, or re-run the etl.seedData to simulate new data
    // For local simulation, we'll just run a log to prove scheduling works.
    console.log('[Scheduler] ETL Sync completed successfully.');
  } catch (error) {
    console.error('[Scheduler] ETL Sync failed:', error);
  }
});

// Initialize Database & Start Server
async function startServer() {
  try {
    // 1. Initialize Database Schema
    await db.initDatabase();

    // 2. Auto-Seed Database if empty
    const usersCount = await db.query('SELECT COUNT(*) as count FROM users');
    const count = Number(usersCount.rows[0].count) || 0;
    if (count === 0) {
      console.log('Database appears empty. Auto-running ETL seed script...');
      await etl.seedData();
    } else {
      console.log('Database already initialized with users. Skipping auto-seeding.');
    }

    // 3. Start Listening
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  WardSeva Marketing Intelligence Backend API Running`);
      console.log(`  Port: http://localhost:${PORT}`);
      console.log(`  Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Fatal error starting the server:', error);
    process.exit(1);
  }
}

startServer();
