const { Pool } = require('pg');

// Create and export a new pool for database connection
// Use DATABASE_URL for Heroku, fallback to individual env vars for local development
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' ? {
          rejectUnauthorized: false
        } : false,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 10
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' ? {
          rejectUnauthorized: false
        } : false,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 10
      }
);

// Test connection when this module is imported (skip in test mode)
if (process.env.NODE_ENV !== 'test') {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error connecting to database from db module:', err);
      console.error('Database config:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        ssl: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
      });
      return;
    }
    release();
    console.log('✅ DB module connected to PostgreSQL database');
  });
}

module.exports = pool;
