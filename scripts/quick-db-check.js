const { Pool } = require('pg');

// Production database connection
const DATABASE_URL = 'postgres://ueg813d0uqj8vd:p262fd7f5f748434e6f0bbfdf08803521560ee8bf500b237ad8390b9fc013b050@c3v5n5ajfopshl.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dahct0h7n4g77q';

async function quickCheck() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('⚡ Quick Database Check...\n');
    
    // Quick connection test
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful!');
    
    // Quick table counts
    const tables = ['users', 'events', 'eventregistrations', 'attendees', 'organizers'];
    console.log('\n📊 Quick Table Counts:');
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  📄 ${table}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`  ❌ ${table}: Table doesn't exist or error - ${error.message}`);
      }
    }
    
    // Check if data is being stored
    console.log('\n🔍 Data Storage Check:');
    
    try {
      // Check most recent user
      const recentUser = await pool.query('SELECT email, created_at FROM users ORDER BY created_at DESC LIMIT 1');
      if (recentUser.rows.length > 0) {
        console.log(`  👤 Most recent user: ${recentUser.rows[0].email} (${recentUser.rows[0].created_at})`);
      } else {
        console.log('  👤 No users found');
      }
    } catch (error) {
      console.log(`  ❌ Users check failed: ${error.message}`);
    }
    
    try {
      // Check most recent event
      const recentEvent = await pool.query('SELECT event_name, created_at FROM events ORDER BY created_at DESC LIMIT 1');
      if (recentEvent.rows.length > 0) {
        console.log(`  🎪 Most recent event: ${recentEvent.rows[0].event_name} (${recentEvent.rows[0].created_at})`);
      } else {
        console.log('  🎪 No events found');
      }
    } catch (error) {
      console.log(`  ❌ Events check failed: ${error.message}`);
    }
    
    try {
      // Check most recent registration
      const recentReg = await pool.query('SELECT event_id, total_amount, registration_date FROM eventregistrations ORDER BY registration_date DESC LIMIT 1');
      if (recentReg.rows.length > 0) {
        console.log(`  🎫 Most recent registration: Event ${recentReg.rows[0].event_id}, $${recentReg.rows[0].total_amount} (${recentReg.rows[0].registration_date})`);
      } else {
        console.log('  🎫 No registrations found');
      }
    } catch (error) {
      console.log(`  ❌ Registrations check failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Quick check failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Interactive query runner
async function runQuery(queryText) {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log(`🔍 Running query: ${queryText}\n`);
    const result = await pool.query(queryText);
    
    if (result.rows.length > 0) {
      console.table(result.rows);
      console.log(`\n📊 ${result.rows.length} rows returned`);
    } else {
      console.log('No results returned');
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Run custom query
    const query = args.join(' ');
    runQuery(query);
  } else {
    // Run quick check
    quickCheck();
  }
}

module.exports = { quickCheck, runQuery };
