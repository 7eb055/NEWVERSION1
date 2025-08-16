const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' ? { rejectUnauthorized: false } : false
    }
    : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: false
    }
);

async function addEmailVerificationFields() {
  try {
    // Check current users table structure
    const currentColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Current users table columns:');
    currentColumns.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    // Add email verification fields if they don't exist
    const columnsToAdd = [
      'ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE',
      'ADD COLUMN IF NOT EXISTS email_verification_token TEXT',
      'ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP',
      'ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP'
    ];
    
    console.log('\nAdding email verification fields...');
    
    for (const column of columnsToAdd) {
      try {
        await pool.query(`ALTER TABLE users ${column}`);
        console.log(`✅ Added: ${column}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Column already exists: ${column}`);
        } else {
          console.error(`❌ Error adding ${column}:`, error.message);
        }
      }
    }
    
    // Check final structure
    console.log('\n📊 Final users table structure:');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    finalColumns.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addEmailVerificationFields();
