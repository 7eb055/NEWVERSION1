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
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Database URL available:', !!process.env.DATABASE_URL);
    
    // Check if tables already exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'events'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Database tables already exist, checking for missing columns...');
      
      // Check if users table has authentication columns and add them if missing
      console.log('🔄 Checking for authentication columns in users table...');
      
      try {
        // Check if password column exists
        const passwordColumnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'password'
        `);
        
        if (passwordColumnCheck.rows.length === 0) {
          console.log('📝 Adding missing authentication columns to users table...');
          
          // Add password column
          await pool.query('ALTER TABLE users ADD COLUMN password character varying(255)');
          console.log('✅ Added password column');
          
          // Add role column
          await pool.query("ALTER TABLE users ADD COLUMN role character varying(50) DEFAULT 'attendee'");
          console.log('✅ Added role column');
          
          // Add is_suspended column
          await pool.query('ALTER TABLE users ADD COLUMN is_suspended boolean DEFAULT false');
          console.log('✅ Added is_suspended column');
          
          console.log('✅ User authentication columns added successfully');
        } else {
          console.log('✅ User authentication columns already exist');
        }
      } catch (migrationError) {
        console.error('⚠️ Migration warning:', migrationError.message);
      }
      
      return;
    }

    console.log('📋 Database is empty, running schema migration...');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, 'database', 'migrations', 'heroku-schema.sql');
    console.log('Schema path:', schemaPath);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('Schema file read, length:', schema.length);
    
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
