const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const isPostgres = !!process.env.DATABASE_URL;
let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  console.log('Database configuration: Connecting to PostgreSQL...');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
} else {
  console.log('Database configuration: Falling back to local SQLite...');
  const dbPath = path.join(__dirname, 'marketing_intelligence.db');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('SQLite database opened at:', dbPath);
    }
  });
}

// Helper to query the DB in a unified way (using pg-style $1, $2 placeholders)
function query(text, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      pgPool.query(text, params, (err, res) => {
        if (err) return reject(err);
        resolve({ rows: res.rows, rowCount: res.rowCount });
      });
    } else {
      // Convert $1, $2 placeholders to ? for SQLite
      let sqliteText = text;
      // Replace $1 with ? etc.
      // SQLite expects ? for parameter placeholders
      // Replace PostgreSQL parameters ($1, $2, etc.) with SQLite placeholders (?)
      sqliteText = sqliteText.replace(/\$(\d+)/g, '?');

      // Check if it is a SELECT/READ operation or a WRITE operation
      const isSelect = sqliteText.trim().match(/^(select|show|describe|pragma)/i);

      if (isSelect) {
        sqliteDb.all(sqliteText, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows: rows || [], rowCount: (rows || []).length });
        });
      } else {
        sqliteDb.run(sqliteText, params, function(err) {
          if (err) return reject(err);
          resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
        });
      }
    }
  });
}

// Helper to run raw script blocks (like table creations)
async function exec(text) {
  if (isPostgres) {
    const client = await pgPool.connect();
    try {
      await client.query(text);
    } finally {
      client.release();
    }
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.exec(text, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

// Database schema initialization
async function initDatabase() {
  console.log('Initializing database schema...');
  if (isPostgres) {
    await exec(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        visitor_id VARCHAR(100) NOT NULL,
        session_id VARCHAR(100) NOT NULL,
        device_type VARCHAR(50) NOT NULL,
        browser VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        traffic_source VARCHAR(100) NOT NULL,
        landing_page VARCHAR(255) NOT NULL,
        time_spent INTEGER NOT NULL, -- in seconds
        pages_visited INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        service_interest VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        campaign_source VARCHAR(255) NOT NULL,
        keyword VARCHAR(255) NOT NULL,
        landing_page VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'New', -- 'New', 'Contacted', 'Qualified', 'Lost', 'Converted'
        revenue NUMERIC(10, 2) DEFAULT 0,
        submission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaign_performance (
        id SERIAL PRIMARY KEY,
        campaign_name VARCHAR(255) NOT NULL,
        ad_group VARCHAR(255) NOT NULL,
        keyword VARCHAR(255) NOT NULL,
        cost NUMERIC(10, 2) NOT NULL,
        clicks INTEGER NOT NULL,
        conversions INTEGER NOT NULL,
        recorded_date DATE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_recommendations (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL, -- 'budget', 'keyword', 'schedule', 'geo'
        title VARCHAR(255) NOT NULL,
        recommendation TEXT NOT NULL,
        deep_dive TEXT,
        impact_score INTEGER DEFAULT 5, -- 1-10 scale
        status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Applied', 'Dismissed'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    await exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_id VARCHAR(100) NOT NULL,
        session_id VARCHAR(100) NOT NULL,
        device_type VARCHAR(50) NOT NULL,
        browser VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        traffic_source VARCHAR(100) NOT NULL,
        landing_page VARCHAR(255) NOT NULL,
        time_spent INTEGER NOT NULL,
        pages_visited INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        service_interest VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        campaign_source VARCHAR(255) NOT NULL,
        keyword VARCHAR(255) NOT NULL,
        landing_page VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'New',
        revenue NUMERIC(10, 2) DEFAULT 0,
        submission_time DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaign_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_name VARCHAR(255) NOT NULL,
        ad_group VARCHAR(255) NOT NULL,
        keyword VARCHAR(255) NOT NULL,
        cost NUMERIC(10, 2) NOT NULL,
        clicks INTEGER NOT NULL,
        conversions INTEGER NOT NULL,
        recorded_date DATE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        recommendation TEXT NOT NULL,
        deep_dive TEXT,
        impact_score INTEGER DEFAULT 5,
        status VARCHAR(50) DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  console.log('Database schema initialization complete!');
}

module.exports = {
  query,
  exec,
  initDatabase,
  isPostgres
};
