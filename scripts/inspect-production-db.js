const { Pool } = require('pg');

// Production database connection
const DATABASE_URL = 'postgres://ueg813d0uqj8vd:p262fd7f5f748434e6f0bbfdf08803521560ee8bf500b237ad8390b9fc013b050@c3v5n5ajfopshl.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dahct0h7n4g77q';

async function inspectProductionDatabase() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Connecting to Production Database...\n');
    
    // Test connection
    const connection = await pool.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Connected successfully!');
    console.log(`📅 Current time: ${connection.rows[0].current_time}`);
    console.log(`🗄️ Database version: ${connection.rows[0].db_version.split(' ')[0]}\n`);
    
    // Check all tables and their row counts
    console.log('📊 DATABASE OVERVIEW:');
    console.log('='.repeat(50));
    
    const tables = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as column_count
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log(`📋 Found ${tables.rows.length} tables:`);
    
    for (const table of tables.rows) {
      try {
        const count = await pool.query(`SELECT COUNT(*) as count FROM ${table.tablename}`);
        const rowCount = parseInt(count.rows[0].count);
        console.log(`  📄 ${table.tablename}: ${rowCount} rows (${table.column_count} columns)`);
      } catch (error) {
        console.log(`  ❌ ${table.tablename}: Error - ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 DETAILED TABLE INSPECTION:');
    console.log('='.repeat(50));
    
    // Check users table
    console.log('\n👥 USERS TABLE:');
    try {
      const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`Total users: ${usersCount.rows[0].count}`);
      
      if (parseInt(usersCount.rows[0].count) > 0) {
        // Check user structure
        const userColumns = await pool.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          ORDER BY ordinal_position
        `);
        console.log('User table structure:');
        console.table(userColumns.rows);
        
        // Get sample users
        const sampleUsers = await pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 5');
        console.log('Recent users:');
        console.table(sampleUsers.rows);
        
        // User statistics
        const userStats = await pool.query(`
          SELECT 
            role,
            COUNT(*) as count
          FROM users 
          GROUP BY role
        `);
        console.log('Users by role:');
        console.table(userStats.rows);
      }
    } catch (error) {
      console.log(`❌ Users table error: ${error.message}`);
    }
    
    // Check events table
    console.log('\n🎪 EVENTS TABLE:');
    try {
      const eventsCount = await pool.query('SELECT COUNT(*) as count FROM events');
      console.log(`Total events: ${eventsCount.rows[0].count}`);
      
      if (parseInt(eventsCount.rows[0].count) > 0) {
        // Get sample events
        const sampleEvents = await pool.query('SELECT * FROM events ORDER BY created_at DESC LIMIT 5');
        console.log('Recent events:');
        console.table(sampleEvents.rows);
        
        // Event statistics
        const eventStats = await pool.query(`
          SELECT 
            status,
            COUNT(*) as count
          FROM events 
          GROUP BY status
        `);
        console.log('Events by status:');
        console.table(eventStats.rows);
      }
    } catch (error) {
      console.log(`❌ Events table error: ${error.message}`);
    }
    
    // Check registrations
    console.log('\n🎫 REGISTRATIONS TABLE:');
    try {
      const regCount = await pool.query('SELECT COUNT(*) as count FROM eventregistrations');
      console.log(`Total registrations: ${regCount.rows[0].count}`);
      
      if (parseInt(regCount.rows[0].count) > 0) {
        const sampleRegs = await pool.query('SELECT * FROM eventregistrations ORDER BY registration_date DESC LIMIT 5');
        console.log('Recent registrations:');
        console.table(sampleRegs.rows);
        
        // Registration statistics
        const regStats = await pool.query(`
          SELECT 
            payment_status,
            COUNT(*) as count,
            SUM(total_amount) as total_revenue
          FROM eventregistrations 
          GROUP BY payment_status
        `);
        console.log('Registration statistics:');
        console.table(regStats.rows);
      }
    } catch (error) {
      console.log(`❌ Registrations table error: ${error.message}`);
    }
    
    // Check attendees
    console.log('\n🙋 ATTENDEES TABLE:');
    try {
      const attendeesCount = await pool.query('SELECT COUNT(*) as count FROM attendees');
      console.log(`Total attendees: ${attendeesCount.rows[0].count}`);
      
      if (parseInt(attendeesCount.rows[0].count) > 0) {
        const sampleAttendees = await pool.query('SELECT * FROM attendees ORDER BY created_at DESC LIMIT 5');
        console.log('Recent attendees:');
        console.table(sampleAttendees.rows);
      }
    } catch (error) {
      console.log(`❌ Attendees table error: ${error.message}`);
    }
    
    // Check organizers
    console.log('\n🏢 ORGANIZERS TABLE:');
    try {
      const organizersCount = await pool.query('SELECT COUNT(*) as count FROM organizers');
      console.log(`Total organizers: ${organizersCount.rows[0].count}`);
      
      if (parseInt(organizersCount.rows[0].count) > 0) {
        const sampleOrganizers = await pool.query('SELECT * FROM organizers ORDER BY created_at DESC LIMIT 5');
        console.log('Recent organizers:');
        console.table(sampleOrganizers.rows);
      }
    } catch (error) {
      console.log(`❌ Organizers table error: ${error.message}`);
    }
    
    // Recent activity across all tables
    console.log('\n⚡ RECENT ACTIVITY (Last 24 Hours):');
    try {
      const recentActivity = await pool.query(`
        SELECT 
          'User Registration' as activity_type,
          email as details,
          created_at as timestamp
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        
        UNION ALL
        
        SELECT 
          'Event Created' as activity_type,
          event_name as details,
          created_at as timestamp
        FROM events 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        
        UNION ALL
        
        SELECT 
          'Event Registration' as activity_type,
          CONCAT('Event ID: ', event_id, ', Amount: $', total_amount) as details,
          registration_date as timestamp
        FROM eventregistrations 
        WHERE registration_date >= NOW() - INTERVAL '24 hours'
        
        ORDER BY timestamp DESC
        LIMIT 20
      `);
      
      if (recentActivity.rows.length > 0) {
        console.table(recentActivity.rows);
      } else {
        console.log('No activity in the last 24 hours');
      }
    } catch (error) {
      console.log(`❌ Recent activity error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Database inspection completed!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the inspection
if (require.main === module) {
  inspectProductionDatabase()
    .then(() => {
      console.log('\n🎯 Inspection complete! Press any key to exit...');
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', process.exit.bind(process, 0));
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { inspectProductionDatabase };
