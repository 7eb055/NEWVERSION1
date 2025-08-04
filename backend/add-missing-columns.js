const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function addMissingColumns() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add missing notes column
    await client.query(`
      ALTER TABLE eventregistrations
      ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
    `);

    // Also add any other missing columns that are part of the registration payload
    await client.query(`
      ALTER TABLE eventregistrations
      ADD COLUMN IF NOT EXISTS special_requirements TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS accessibility_needs TEXT DEFAULT NULL;
    `);

    await client.query('COMMIT');
    console.log('Successfully added missing columns');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding columns:', error);
    throw error;
  } finally {
    client.release();
  }
}

addMissingColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
