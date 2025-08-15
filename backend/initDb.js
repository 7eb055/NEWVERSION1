const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database initialization script for Heroku deployment
async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🔄 Starting database initialization...');
    
    // Check if tables already exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'events'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Database tables already exist, skipping initialization');
      return;
    }

    console.log('📋 Database is empty, running schema migration...');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, 'database', 'migrations', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    
    console.log('✅ Database schema initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

module.exports = { initializeDatabase };
