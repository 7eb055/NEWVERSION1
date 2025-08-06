const { Pool } = require('pg');

// Create and export a new pool for database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test connection when this module is imported
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database from db module:', err);
    return;
  }
  release();
  console.log('✅ DB module connected to PostgreSQL database');
});

module.exports = pool;
