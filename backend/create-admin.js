const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'event_management_db',
  password: process.env.DB_PASSWORD || '2312',
  port: process.env.DB_PORT || 5432,
});

// Admin credentials
const ADMIN_EMAIL = 'admin@eventsystem.com';
const ADMIN_PASSWORD = 'AdminEventSystem2025!';

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...');

    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Admin user already exists!');
      console.log('📧 Email:', ADMIN_EMAIL);
      console.log('🔑 Password:', ADMIN_PASSWORD);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Insert admin user
    const result = await pool.query(
      `INSERT INTO users (email, password, role_type, is_email_verified, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING user_id, email, role_type`,
      [ADMIN_EMAIL, hashedPassword, 'admin', true]
    );

    console.log('✅ Admin user created successfully!');
    console.log('📊 User Details:', result.rows[0]);
    console.log('');
    console.log('🎯 ADMIN LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', ADMIN_EMAIL);
    console.log('🔑 Password: ', ADMIN_PASSWORD);
    console.log('🛡️  Role:     admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🌐 Login at: http://localhost:5173/login');
    console.log('🛡️  Dashboard: http://localhost:5173/admin-dashboard');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createAdminUser();
