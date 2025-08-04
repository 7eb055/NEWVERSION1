const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function addNotesColumn() {
  try {
    await pool.query(`
      DO $$ 
      BEGIN 
          BEGIN
              ALTER TABLE eventregistrations 
              ADD COLUMN notes TEXT;
          EXCEPTION 
              WHEN duplicate_column THEN 
                  RAISE NOTICE 'Column notes already exists';
          END;
      END $$;
    `);
    console.log('Successfully added notes column');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

addNotesColumn();
