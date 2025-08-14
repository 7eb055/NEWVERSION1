const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function addRegistrationTypeColumn() {
  try {
    // Simpler SQL that works with PostgreSQL
    await pool.query(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE eventregistrations ADD COLUMN registration_type VARCHAR(50) DEFAULT 'standard';
        EXCEPTION 
          WHEN duplicate_column THEN 
            RAISE NOTICE 'Column registration_type already exists';
        END;
        
        UPDATE eventregistrations 
        SET registration_type = 'standard' 
        WHERE registration_type IS NULL;
      END $$;
    `);
    
    console.log('Successfully added registration_type column');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

addRegistrationTypeColumn();
