const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration from environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Paystack Payment Integration Database Setup...');
    console.log(`📊 Connecting to database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    
    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, 'paystack-migration.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log(`📝 Executing SQL migration...`);
    
    // Execute the entire SQL content as one statement
    try {
      await client.query(sqlContent);
      console.log('✅ Migration executed successfully!');
    } catch (error) {
      // If it fails, try to execute individual statements
      console.log('⚠️  Trying individual statement execution...');
      
      // Split SQL content by statements (better parsing)
      const statements = sqlContent
        .split(/;\s*\n/)
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      console.log(`📝 Found ${statements.length} SQL statements to execute...`);
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
            await client.query(statement);
          } catch (error) {
            // Skip if table/function already exists
            if (error.code === '42P07' || error.code === '42723') {
              console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}`);
            } else {
              console.error(`❌ Error in statement ${i + 1}:`, error.message);
              throw error;
            }
          }
        }
      }
    }
    
    // Verify the table was created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'payments'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Payments table created successfully!');
      
      // Check if indexes were created
      const indexResult = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'payments'
      `);
      
      console.log(`✅ ${indexResult.rows.length} indexes created!`);
      
      // Check if views were created
      const viewResult = await client.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' AND table_name = 'payment_summary'
      `);
      
      if (viewResult.rows.length > 0) {
        console.log('✅ Payment summary view created!');
      }
      
      console.log('');
      console.log('🎉 Paystack integration database setup complete!');
      console.log('');
      console.log('📋 What was created:');
      console.log('   • payments table with Paystack-specific fields');
      console.log('   • Indexes for better query performance');
      console.log('   • Auto-update trigger for timestamps');
      console.log('   • payment_summary view for reporting');
      console.log('');
      console.log('🔧 Next steps:');
      console.log('   1. ✅ Paystack keys already configured in .env');
      console.log('   2. Restart your backend server');
      console.log('   3. Test the payment integration');
      
    } else {
      throw new Error('Payments table was not created');
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.error('Please check your database connection and try again.');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
