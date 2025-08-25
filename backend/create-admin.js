const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

// Database configuration - uses DATABASE_URL for Heroku compatibility
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Admin credentials
const ADMIN_EMAIL = 'admin@eventify.com';
const ADMIN_PASSWORD = 'AdminEventify2025!';
const ADMIN_USERNAME = 'admin';

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...');
    console.log('🌐 Database:', process.env.DATABASE_URL ? 'Connected to Heroku Postgres' : 'Local connection');

    // Check if admin already exists in users table
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    // Check if admin exists in admin_users table
    const existingAdmin = await pool.query(
      'SELECT admin_id FROM admin_users WHERE email = $1 OR username = $2',
      [ADMIN_EMAIL, ADMIN_USERNAME]
    );

    if (existingUser.rows.length > 0 || existingAdmin.rows.length > 0) {
      console.log('⚠️  Admin user already exists!');
      console.log('📧 Email:', ADMIN_EMAIL);
      console.log('� Username:', ADMIN_USERNAME);
      console.log('�🔑 Password:', ADMIN_PASSWORD);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Insert into users table for authentication
    const userResult = await pool.query(
      `INSERT INTO users (email, password, role_type, is_email_verified, account_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING user_id, email, role_type`,
      [ADMIN_EMAIL, hashedPassword, 'admin', true, 'active']
    );

    // Insert into admin_users table for admin-specific features
    const adminResult = await pool.query(
      `INSERT INTO admin_users (
        username, email, password_hash, full_name, role, permissions,
        is_active, is_super_admin, phone, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING admin_id, username, email, full_name, role, is_super_admin`,
      [
        ADMIN_USERNAME,
        ADMIN_EMAIL,
        hashedPassword,
        'System Administrator',
        'admin',
        JSON.stringify({ all: true, users: true, events: true, reports: true, system: true }),
        true,
        true,
        '+1234567890'
      ]
    );

    console.log('✅ Admin user created successfully!');
    console.log('📊 User Details:', userResult.rows[0]);
    console.log('📊 Admin Details:', adminResult.rows[0]);
    console.log('');
    console.log('🎯 ADMIN LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', ADMIN_EMAIL);
    console.log('� Username: ', ADMIN_USERNAME);
    console.log('�🔑 Password: ', ADMIN_PASSWORD);
    console.log('🛡️  Role:     admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🌐 Login at: https://your-event-app-production-1c49193922fb.herokuapp.com/login');
    console.log('🛡️  Dashboard: https://your-event-app-production-1c49193922fb.herokuapp.com/admin-dashboard');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createAdminUser();
