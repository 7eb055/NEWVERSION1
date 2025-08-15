const { Pool } = require('pg');

async function debugDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🔍 Debugging database schema...');
    
    // Check if users table exists
    const tablesResult = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    console.table(tablesResult.rows);
    
    // Check if there are any users
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('Total users:', userCount.rows[0].count);
    
    // Check all tables
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('All tables:', allTables.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  debugDatabase();
}

module.exports = { debugDatabase };
