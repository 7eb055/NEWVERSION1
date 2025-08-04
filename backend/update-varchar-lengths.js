const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('Starting database connection...');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'events_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function updateVarcharLengths() {
  console.log('Starting migration...');
  let client;
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('Connected successfully');

    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'update-varchar-lengths.sql');
    console.log('Reading SQL file from:', sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Beginning transaction...');
    await client.query('BEGIN');
    
    // Split the SQL file into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim());
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
      }
    }
    
    console.log('Committing transaction...');
    await client.query('COMMIT');
    console.log('✅ Successfully updated varchar lengths in attendees table');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    if (client) {
      console.log('Rolling back transaction...');
      await client.query('ROLLBACK').catch(console.error);
    }
    throw error;
  } finally {
    if (client) {
      console.log('Releasing client...');
      client.release();
    }
    console.log('Closing pool...');
    await pool.end().catch(console.error);
  }
}

updateVarcharLengths().catch(console.error);
