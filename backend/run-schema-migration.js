#!/usr/bin/env node

// Script to align production database schema with code expectations
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
    console.log('🔄 Starting database schema alignment...');
    
    // Read the alignment SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'align-production-schema.sql'), 
      'utf8'
    );

    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Database schema alignment completed successfully!');
    
    // Verify the schema by checking key columns
    const organizersColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'organizers' AND table_schema = 'public'
      AND column_name IN ('organizer_id', 'full_name', 'company_name', 'user_id')
      ORDER BY column_name
    `);
    
    const eventsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'events' AND table_schema = 'public'
      AND column_name IN ('event_id', 'event_name', 'event_description', 'max_attendees')
      ORDER BY column_name
    `);
    
    console.log('📊 New organizers columns added:', organizersColumns.rows.map(r => r.column_name));
    console.log('📊 New events columns added:', eventsColumns.rows.map(r => r.column_name));
    
    console.log('\n✅ Schema alignment completed! Your database should now work with your code.');
    
  } catch (error) {
    console.error('❌ Schema alignment failed:', error.message);
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
