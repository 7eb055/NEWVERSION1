require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function updateResourcesTable() {
  try {
    // Alter the file_size column to be VARCHAR(100)
    await pool.query(`
      ALTER TABLE event_resources 
      ALTER COLUMN file_size TYPE VARCHAR(100)
    `);
    
    console.log('✅ Successfully updated event_resources table');
  } catch (error) {
    console.error('Error updating resources table:', error);
  } finally {
    await pool.end();
  }
}

updateResourcesTable();
