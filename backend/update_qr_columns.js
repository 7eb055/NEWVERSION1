require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function updateDatabase() {
  const client = await pool.connect();
  try {
    // First check if the columns exist
    const checkResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'eventregistrations' 
      AND column_name IN ('qr_code', 'qr_data')
    `);

    // Add columns if they don't exist
    if (!checkResult.rows.find(row => row.column_name === 'qr_code')) {
      await client.query('ALTER TABLE eventregistrations ADD COLUMN qr_code TEXT');
      console.log('Added qr_code column');
    } else {
      await client.query('ALTER TABLE eventregistrations ALTER COLUMN qr_code TYPE TEXT');
      console.log('Modified qr_code column to TEXT');
    }

    if (!checkResult.rows.find(row => row.column_name === 'qr_data')) {
      await client.query('ALTER TABLE eventregistrations ADD COLUMN qr_data TEXT');
      console.log('Added qr_data column');
    } else {
      await client.query('ALTER TABLE eventregistrations ALTER COLUMN qr_data TYPE TEXT');
      console.log('Modified qr_data column to TEXT');
    }

    console.log('Database update completed successfully');
  } catch (err) {
    console.error('Error updating database:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

updateDatabase();
