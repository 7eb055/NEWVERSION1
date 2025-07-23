const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'event_management',
  password: 'your_password', // Change this to your actual password
  port: 5432,
});

async function testDatabaseSetup() {
  console.log('Testing database setup...\n');

  try {
    // Test 1: Check if tables exist
    console.log('1. Checking if tables exist...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('Existing tables:', tables.rows.map(row => row.table_name));

    // Test 2: Try to insert a test user
    console.log('\n2. Testing user registration flow...');
    
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';
    
    // Clean up any existing test data
    await pool.query('DELETE FROM Attendees WHERE user_id IN (SELECT user_id FROM Users WHERE email = $1)', [testEmail]);
    await pool.query('DELETE FROM Users WHERE email = $1', [testEmail]);
    
    // Insert test user
    const userResult = await pool.query(`
      INSERT INTO Users (email, password, role_type, is_email_verified) 
      VALUES ($1, $2, $3, $4) 
      RETURNING user_id, email, role_type
    `, [testEmail, testPassword, 'attendee', true]);
    
    console.log('User created:', userResult.rows[0]);
    
    // Insert attendee record
    const attendeeResult = await pool.query(`
      INSERT INTO Attendees (user_id, full_name, phone) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [userResult.rows[0].user_id, 'Test User', '123-456-7890']);
    
    console.log('Attendee record created:', attendeeResult.rows[0]);
    
    // Test 3: Test user lookup with roles
    console.log('\n3. Testing user lookup with roles...');
    const userLookup = await pool.query(`
      SELECT u.user_id, u.email, u.role_type, a.full_name, a.phone
      FROM Users u
      LEFT JOIN Attendees a ON u.user_id = a.user_id
      WHERE u.email = $1
    `, [testEmail]);
    
    console.log('User lookup result:', userLookup.rows[0]);
    
    // Clean up test data
    console.log('\n4. Cleaning up test data...');
    await pool.query('DELETE FROM Attendees WHERE user_id = $1', [userResult.rows[0].user_id]);
    await pool.query('DELETE FROM Users WHERE user_id = $1', [userResult.rows[0].user_id]);
    
    console.log('✅ Database setup test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testDatabaseSetup();
