const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkTicketTypesSchema() {
  try {
    // Connect to the database
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Get column information for the tickettypes table
    const result = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tickettypes'
      ORDER BY ordinal_position
    `);
    
    // Print table schema
    console.log('\n=== TICKETTYPES TABLE SCHEMA ===');
    if (result.rows.length === 0) {
      console.log('Table does not exist or has no columns');
    } else {
      result.rows.forEach(column => {
        console.log(`${column.column_name}: ${column.data_type} | Default: ${column.column_default || 'null'} | Nullable: ${column.is_nullable}`);
      });
    }
    
    // Check if the is_active column exists
    const isActiveExists = result.rows.some(column => column.column_name === 'is_active');
    console.log(`\nDoes 'is_active' column exist? ${isActiveExists ? 'YES' : 'NO'}`);
    
    // Check if there's any data in the table
    const countResult = await client.query('SELECT COUNT(*) FROM tickettypes');
    console.log(`\nNumber of rows in tickettypes table: ${countResult.rows[0].count}`);
    
    // Release the client
    client.release();
    
    // Close the pool
    await pool.end();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error checking tickettypes schema:', error);
  }
}

// Run the function
checkTicketTypesSchema();
