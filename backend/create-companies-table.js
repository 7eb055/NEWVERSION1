const { Pool } = require('pg');
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
  const client = await pool.connect();
  try {
    console.log('Running migration...');
    
    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        company_id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        company_type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        address TEXT,
        contact_info JSONB NOT NULL,
        description TEXT,
        services TEXT,
        organizer_id INTEGER NOT NULL REFERENCES organizers(organizer_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_name)
      );
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_companies_organizer_id ON companies(organizer_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(company_type);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_companies_category ON companies(category);');

    // Create trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_companies_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_companies_updated_at_trigger ON companies;
      CREATE TRIGGER update_companies_updated_at_trigger
      BEFORE UPDATE ON companies
      FOR EACH ROW
      EXECUTE FUNCTION update_companies_updated_at();
    `);

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
