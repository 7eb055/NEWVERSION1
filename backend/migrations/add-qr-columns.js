require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function addQRColumns() {
  try {
    // Add QR code related columns
    await pool.query(`
      ALTER TABLE eventregistrations 
      ADD COLUMN IF NOT EXISTS qr_code TEXT,
      ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS qr_data JSONB;
    `);

    console.log('✅ Successfully added QR code columns to eventregistrations table');
  } catch (error) {
    console.error('Error adding QR code columns:', error);
  } finally {
    await pool.end();
  }
}

addQRColumns();
