const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupAttendanceTable() {
  try {
    console.log('🔧 Setting up attendance_log table...');
    
    // Create attendance_log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_log (
        log_id SERIAL PRIMARY KEY,
        registration_id INTEGER REFERENCES eventregistrations(registration_id) ON DELETE CASCADE,
        event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        check_out_time TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL
      )
    `);
    
    console.log('✅ attendance_log table created successfully');
    
    // Add some sample attendance data if the table is empty
    const countResult = await pool.query('SELECT COUNT(*) FROM attendance_log');
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      console.log('📊 Adding sample attendance data...');
      
      // Get some sample registrations
      const registrations = await pool.query(`
        SELECT er.registration_id, er.event_id 
        FROM eventregistrations er 
        LIMIT 3
      `);
      
      if (registrations.rows.length > 0) {
        for (const reg of registrations.rows) {
          await pool.query(`
            INSERT INTO attendance_log (registration_id, event_id, check_in_time)
            VALUES ($1, $2, NOW() - INTERVAL '1 hour')
          `, [reg.registration_id, reg.event_id]);
        }
        console.log(`✅ Added ${registrations.rows.length} sample attendance records`);
      }
    }
    
    console.log('🎉 Attendance table setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up attendance table:', error);
  } finally {
    await pool.end();
  }
}

setupAttendanceTable();
