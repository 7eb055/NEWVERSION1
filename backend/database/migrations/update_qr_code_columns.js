const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function updateQRCodeColumns() {
  try {
    const client = await pool.connect();
    try {
      await client.query('ALTER TABLE eventregistrations ALTER COLUMN qr_code SET DATA TYPE TEXT');
      await client.query('ALTER TABLE eventregistrations ALTER COLUMN qr_data SET DATA TYPE TEXT');
      console.log('Successfully updated QR code columns to TEXT type');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating QR code columns:', error);
  } finally {
    await pool.end();
  }
}

updateQRCodeColumns();
