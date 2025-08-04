const { Pool } = require('pg');
require('dotenv').config();

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
    
    // Drop triggers and functions first
    await client.query(`
      DROP TRIGGER IF EXISTS update_eventcompanies_updated_at_trigger ON eventcompanies;
      DROP FUNCTION IF EXISTS update_eventcompanies_updated_at();
    `);

    // Drop and recreate the table
    await client.query(`
      DROP TABLE IF EXISTS eventcompanies CASCADE;
      
      CREATE TABLE eventcompanies (
        company_id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        company_type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        address TEXT,
        contact_info JSONB NOT NULL,
        description TEXT,
        services TEXT,
        organizer_id INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_name),
        FOREIGN KEY (organizer_id) REFERENCES organizers(organizer_id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX idx_eventcompanies_organizer_id ON eventcompanies(organizer_id);
      CREATE INDEX idx_eventcompanies_type ON eventcompanies(company_type);
      CREATE INDEX idx_eventcompanies_category ON eventcompanies(category);
    `);

    // Create trigger function and trigger
    await client.query(`
      CREATE FUNCTION update_eventcompanies_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER update_eventcompanies_updated_at_trigger
          BEFORE UPDATE ON eventcompanies
          FOR EACH ROW
          EXECUTE FUNCTION update_eventcompanies_updated_at();
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
