const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'event_management_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function testEmailVerification() {
  console.log('Testing email verification flow...\n');

  try {
    // 1. Check database structure
    console.log('1. Checking database structure...');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name LIKE '%email%verified%'
      ORDER BY column_name
    `);
    
    console.log('Email verification columns:', columns.rows);

    // 2. Check if we have the correct column
    const correctColumn = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'is_email_verified'
    `);

    if (correctColumn.rows.length === 0) {
      console.log('\n❌ Column "is_email_verified" not found!');
      
      // Check if old column exists
      const oldColumn = await pool.query(`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email_verified'
      `);

      if (oldColumn.rows.length > 0) {
        console.log('Found "email_verified" column. Renaming to "is_email_verified"...');
        await pool.query('ALTER TABLE Users RENAME COLUMN email_verified TO is_email_verified');
        console.log('✅ Column renamed successfully!');
      } else {
        console.log('Adding "is_email_verified" column...');
        await pool.query('ALTER TABLE Users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE');
        console.log('✅ Column added successfully!');
      }
    } else {
      console.log('✅ Column "is_email_verified" exists!');
    }

    // 3. Test a verification scenario (if you have test data)
    console.log('\n3. Testing verification query...');
    const testQuery = await pool.query(`
      SELECT user_id, email, is_email_verified, 
             email_verification_token IS NOT NULL as has_token
      FROM Users 
      LIMIT 3
    `);
    
    console.log('Sample user data:');
    testQuery.rows.forEach(row => {
      console.log(`- User ${row.user_id}: ${row.email}, verified: ${row.is_email_verified}, has_token: ${row.has_token}`);
    });

    console.log('\n✅ Email verification system is ready!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testEmailVerification();
