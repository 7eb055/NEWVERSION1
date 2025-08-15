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
      console.log('✅ Database tables already exist, checking for missing tables and columns...');
      
      // Check if attendees table exists and create it if missing
      console.log('🔄 Checking for attendees table...');
      
      try {
        const attendeesTableCheck = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'attendees'
        `);
        
        if (attendeesTableCheck.rows.length === 0) {
          console.log('📝 Creating missing attendees table...');
          
          // Create attendees table
          await pool.query(`
            CREATE TABLE public.attendees (
              attendee_id SERIAL PRIMARY KEY,
              user_id integer NOT NULL,
              name character varying(100) NOT NULL,
              phone character varying(20),
              full_name character varying(200),
              created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
              updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log('✅ Attendees table created successfully');
        } else {
          console.log('✅ Attendees table already exists');
        }
      } catch (attendeesError) {
        console.error('⚠️ Attendees table creation warning:', attendeesError.message);
      }
      
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
          await pool.query('ALTER TABLE users ADD COLUMN role character varying(50) DEFAULT \'attendee\'');
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

// Execute if this file is run directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database initialization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database initialization failed:', error);
      process.exit(1);
    });
}
