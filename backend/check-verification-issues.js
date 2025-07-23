const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'event_management_db',
  password: 'your_password',
  port: 5432,
});

async function checkVerificationIssues() {
  try {
    console.log('🔍 Checking for verification issues...\n');

    // Check for users with verification tokens
    const usersWithTokens = await pool.query(`
      SELECT user_id, email, is_email_verified, 
             email_verification_token IS NOT NULL as has_token,
             email_verification_token_expires,
             email_verification_token_expires > NOW() as token_not_expired,
             created_at
      FROM Users 
      WHERE email_verification_token IS NOT NULL
      ORDER BY created_at DESC
    `);

    console.log('📋 Users with verification tokens:');
    console.table(usersWithTokens.rows);

    // Check for duplicate tokens
    const duplicateTokens = await pool.query(`
      SELECT email_verification_token, COUNT(*) as count
      FROM Users 
      WHERE email_verification_token IS NOT NULL
      GROUP BY email_verification_token
      HAVING COUNT(*) > 1
    `);

    if (duplicateTokens.rows.length > 0) {
      console.log('⚠️  DUPLICATE TOKENS FOUND:');
      console.table(duplicateTokens.rows);
    } else {
      console.log('✅ No duplicate tokens found');
    }

    // Check for already verified users with tokens
    const verifiedWithTokens = await pool.query(`
      SELECT user_id, email, is_email_verified, 
             email_verification_token IS NOT NULL as has_token
      FROM Users 
      WHERE is_email_verified = TRUE 
      AND email_verification_token IS NOT NULL
    `);

    if (verifiedWithTokens.rows.length > 0) {
      console.log('⚠️  VERIFIED USERS STILL HAVE TOKENS:');
      console.table(verifiedWithTokens.rows);
    } else {
      console.log('✅ No verified users have lingering tokens');
    }

    // Check recent verification activity
    const recentActivity = await pool.query(`
      SELECT user_id, email, is_email_verified, email_verified_at, 
             created_at, updated_at
      FROM Users 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
    `);

    console.log('\n📊 Recent user activity (last hour):');
    console.table(recentActivity.rows);

  } catch (error) {
    console.error('Error checking verification issues:', error);
  } finally {
    await pool.end();
  }
}

checkVerificationIssues();
