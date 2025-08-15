const { Pool } = require('pg');

// Production database connection string
const DATABASE_URL = 'postgres://ueg813d0uqj8vd:p262fd7f5f748434e6f0bbfdf08803521560ee8bf500b237ad8390b9fc013b050@c3v5n5ajfopshl.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dahct0h7n4g77q';

async function inspectDatabase() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Connecting to Production Database...\n');
    
    // Test connection
    const testQuery = await pool.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Database connected successfully!');
    console.log(`📅 Current time: ${testQuery.rows[0].current_time}`);
    console.log(`🗄️ Database version: ${testQuery.rows[0].db_version.split(' ')[0]}\n`);
    
    // Check all tables
    console.log('📋 Checking database tables...');
    const tables = await pool.query(`
      SELECT 
        table_name,
        table_type,
        (SELECT COUNT(*) 
         FROM information_schema.columns 
         WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('❌ No tables found in the database!');
      console.log('💡 This means the database schema hasn\'t been created yet.');
      return;
    }
    
    console.log(`\n📊 Found ${tables.rows.length} tables:`);
    console.table(tables.rows);
    
    // Check data in each table
    for (const table of tables.rows) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`\n📋 Table: ${table.table_name} - ${count} rows`);
        
        if (count > 0) {
          // Get sample data
          const sampleData = await pool.query(`SELECT * FROM ${table.table_name} LIMIT 3`);
          console.table(sampleData.rows);
        } else {
          console.log('   (empty table)');
        }
      } catch (error) {
        console.log(`   ❌ Error querying ${table.table_name}: ${error.message}`);
      }
    }
    
    // Check for users specifically
    try {
      console.log('\n👥 Users Summary:');
      const userStats = await pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE role = 'attendee') as attendees,
          COUNT(*) FILTER (WHERE role = 'organizer') as organizers,
          COUNT(*) FILTER (WHERE role = 'admin') as admins
        FROM users
      `);
      console.table(userStats.rows);
      
      // Recent users
      const recentUsers = await pool.query(`
        SELECT id, email, role, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log('\n🆕 Recent Users:');
      console.table(recentUsers.rows);
    } catch (error) {
      console.log('\n❌ Users table not accessible:', error.message);
    }
    
    // Check for events
    try {
      console.log('\n🎪 Events Summary:');
      const eventStats = await pool.query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE status = 'published') as published,
          COUNT(*) FILTER (WHERE status = 'draft') as drafts
        FROM events
      `);
      console.table(eventStats.rows);
    } catch (error) {
      console.log('\n❌ Events table not accessible:', error.message);
    }
    
    // Check for registrations
    try {
      console.log('\n🎫 Registrations Summary:');
      const regStats = await pool.query(`
        SELECT 
          COUNT(*) as total_registrations,
          SUM(total_amount) as total_revenue
        FROM eventregistrations
      `);
      console.table(regStats.rows);
    } catch (error) {
      console.log('\n❌ Registrations table not accessible:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database inspection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
    console.log('\n🔚 Database connection closed.');
  }
}

// Run if called directly
if (require.main === module) {
  inspectDatabase().catch(console.error);
}

module.exports = { inspectDatabase };
