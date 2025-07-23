const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'event_management_db',
  password: '2312',
  port: 5432,
});

async function cleanupVerificationIssues() {
  try {
    console.log('🔍 Checking for verification database issues...\n');

    // 1. Check for verified users with tokens (this is the likely issue)
    const verifiedWithTokens = await pool.query(`
      SELECT user_id, email, is_email_verified, 
             email_verification_token IS NOT NULL as has_token,
             email_verification_token_expires,
             created_at
      FROM Users 
      WHERE is_email_verified = TRUE 
      AND email_verification_token IS NOT NULL
      ORDER BY created_at DESC
    `);

    console.log('⚠️  VERIFIED USERS WITH LINGERING TOKENS:');
    if (verifiedWithTokens.rows.length > 0) {
      console.table(verifiedWithTokens.rows);
      
      // Clean up these tokens
      console.log('\n🧹 Cleaning up tokens for verified users...');
      const cleanupResult = await pool.query(`
        UPDATE Users 
        SET email_verification_token = NULL,
            email_verification_token_expires = NULL
        WHERE is_email_verified = TRUE 
        AND email_verification_token IS NOT NULL
        RETURNING user_id, email
      `);
      
      console.log(`✅ Cleaned up ${cleanupResult.rows.length} verified users with lingering tokens:`);
      console.table(cleanupResult.rows);
    } else {
      console.log('✅ No verified users have lingering tokens');
    }

    // 2. Check for unverified users
    const unverifiedUsers = await pool.query(`
      SELECT user_id, email, is_email_verified,
             email_verification_token IS NOT NULL as has_token,
             email_verification_token_expires,
             email_verification_token_expires > NOW() as token_not_expired,
             created_at
      FROM Users 
      WHERE is_email_verified = FALSE
      ORDER BY created_at DESC
    `);

    console.log('\n📋 UNVERIFIED USERS:');
    if (unverifiedUsers.rows.length > 0) {
      console.table(unverifiedUsers.rows);
    } else {
      console.log('✅ All users are verified');
    }

    // 3. Check for duplicate tokens
    const duplicateTokens = await pool.query(`
      SELECT email_verification_token, COUNT(*) as count,
             array_agg(email) as emails
      FROM Users 
      WHERE email_verification_token IS NOT NULL
      GROUP BY email_verification_token
      HAVING COUNT(*) > 1
    `);

    if (duplicateTokens.rows.length > 0) {
      console.log('\n⚠️  DUPLICATE TOKENS FOUND:');
      console.table(duplicateTokens.rows);
    } else {
      console.log('\n✅ No duplicate tokens found');
    }

    // 4. Check total user summary
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_email_verified = TRUE THEN 1 END) as verified_users,
        COUNT(CASE WHEN is_email_verified = FALSE THEN 1 END) as unverified_users,
        COUNT(CASE WHEN email_verification_token IS NOT NULL THEN 1 END) as users_with_tokens
      FROM Users
    `);

    console.log('\n📊 USER SUMMARY:');
    console.table(summary.rows);

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await pool.end();
  }
}

cleanupVerificationIssues();
