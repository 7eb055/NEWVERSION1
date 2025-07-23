const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'event_management_db',
  password: '2312',
  port: 5432,
});

async function debugCurrentIssue() {
  try {
    console.log('🔍 Debugging current verification issue...\n');

    // Check all current users and their tokens
    const allUsers = await pool.query(`
      SELECT user_id, email, is_email_verified,
             email_verification_token IS NOT NULL as has_token,
             CASE 
               WHEN email_verification_token IS NOT NULL THEN LEFT(email_verification_token, 16) || '...'
               ELSE 'No token'
             END as token_preview,
             email_verification_token_expires,
             created_at
      FROM Users 
      ORDER BY created_at DESC
    `);

    console.log('📋 All users in database:');
    console.table(allUsers.rows);

    // If there are any users with tokens, let's test one
    const userWithToken = await pool.query(`
      SELECT user_id, email, email_verification_token, is_email_verified
      FROM Users 
      WHERE email_verification_token IS NOT NULL
      LIMIT 1
    `);

    if (userWithToken.rows.length > 0) {
      const user = userWithToken.rows[0];
      console.log('\n🧪 Testing with existing token...');
      console.log('User info:', {
        email: user.email,
        is_verified: user.is_email_verified,
        token_preview: user.email_verification_token.substring(0, 16) + '...'
      });

      // Simulate what happens when verification endpoint is called
      console.log('\n🔍 Simulating verification endpoint logic...');
      
      const tokenLookup = await pool.query(
        `SELECT user_id, email, is_email_verified, email_verification_token
         FROM Users 
         WHERE email_verification_token = $1`,
        [user.email_verification_token]
      );

      console.log('Token lookup result:', {
        found: tokenLookup.rows.length > 0,
        user_data: tokenLookup.rows[0]
      });

      if (tokenLookup.rows.length > 0) {
        const foundUser = tokenLookup.rows[0];
        if (foundUser.is_email_verified) {
          console.log('❌ ISSUE FOUND: User is already verified but still has a token!');
          console.log('This would cause the "already verified" message');
          
          // Fix the issue
          console.log('\n🔧 Fixing the issue by clearing the token...');
          await pool.query(
            `UPDATE Users 
             SET email_verification_token = NULL,
                 email_verification_token_expires = NULL
             WHERE user_id = $1`,
            [foundUser.user_id]
          );
          console.log('✅ Token cleared for verified user');
        } else {
          console.log('✅ User is correctly unverified with token');
        }
      }
    } else {
      console.log('\n✅ No users currently have verification tokens');
      
      // Check recent verification logs if the table exists
      try {
        const recentLogs = await pool.query(`
          SELECT user_id, email, verification_token, verification_success, created_at
          FROM EmailVerificationLogs 
          ORDER BY created_at DESC 
          LIMIT 10
        `);
        
        console.log('\n📜 Recent verification logs:');
        console.table(recentLogs.rows);
      } catch (error) {
        console.log('No verification logs table found');
      }
    }

  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await pool.end();
  }
}

debugCurrentIssue();
