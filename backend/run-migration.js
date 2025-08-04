const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config();

// Create a new pool using environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'create_companies_table.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');

    console.log('Running migration...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Split the SQL into individual statements and execute them
      const statements = sql.split(';').filter(stmt => stmt.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await client.query(statement);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ Migration completed successfully!');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
