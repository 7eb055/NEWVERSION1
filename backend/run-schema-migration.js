#!/usr/bin/env node

// Script to fix production database schema
const { Pool } = require('pg');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Starting database schema migration...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'fix-production-schema.sql'), 
      'utf8'
    );

    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Database schema migration completed successfully!');
    
    // Verify the schema by checking key tables
    const organizersColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'organizers' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const eventsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'events' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Organizers table columns:', organizersColumns.rows.length);
    console.log('📊 Events table columns:', eventsColumns.rows.length);
    
    console.log('\n✅ Migration completed! Your database schema should now be fixed.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
