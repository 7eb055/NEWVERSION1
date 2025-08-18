const { Pool } = require('pg');

// Load environment variables if not already loaded
if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
  require('dotenv').config();
}

// Create and export a new pool for database connection
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' ? { rejectUnauthorized: false } : false
    }
    : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' ? { rejectUnauthorized: false } : false
    }
);

// Test connection when this module is imported (skip in test mode)
if (process.env.NODE_ENV !== 'test') {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error connecting to database from db module:', err);
      console.error('Database config:', {
        DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        NODE_ENV: process.env.NODE_ENV,
        ssl: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
      });
      return;
    }
    release();
    console.log('✅ DB module connected to PostgreSQL database');
  });
}

module.exports = pool;
