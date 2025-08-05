const fs = require('fs').promises;
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function updateColumns() {
  const client = await pool.connect();
  try {
    const sql = await fs.readFile('./fix_qr_columns.sql', 'utf8');
    await client.query(sql);
    console.log('Successfully updated QR code columns');
  } catch (err) {
    console.error('Error updating columns:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

updateColumns();
