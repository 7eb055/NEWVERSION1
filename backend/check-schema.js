const { Pool } = require('pg');
require('dotenv').config();

// Database configuration from environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking existing database schema...');
    
    // Check if payments table already exists
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'payments'
    `);
    
    if (tableResult.rows.length > 0) {
      console.log('✅ Payments table already exists!');
      
      // Get column details
      const columnResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'payments'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Existing payments table columns:');
      columnResult.rows.forEach(col => {
        console.log(`   • ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
    } else {
      console.log('❌ Payments table does not exist - will be created');
    }
    
    // Check referenced tables
    console.log('\n🔗 Checking referenced tables...');
    
    const tables = ['eventregistrations', 'events', 'users'];
    for (const table of tables) {
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [table]);
      
      if (result.rows.length > 0) {
        console.log(`   ✅ ${table} table exists`);
      } else {
        console.log(`   ❌ ${table} table MISSING - this may cause foreign key errors`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
