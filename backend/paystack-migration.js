const { Pool } = require('pg');
require('dotenv').config();

// Database configuration from environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runPaystackMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Paystack Payment Integration Database Setup...');
    console.log(`📊 Connecting to database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    
    // Define the columns to add
    const columnsToAdd = [
      { name: 'paystack_reference', type: 'VARCHAR(255)' },
      { name: 'paystack_transaction_id', type: 'VARCHAR(255)' },
      { name: 'paystack_access_code', type: 'VARCHAR(255)' },
      { name: 'currency', type: 'VARCHAR(3) DEFAULT \'GHS\'' },
      { name: 'gateway_response', type: 'TEXT' },
      { name: 'channel', type: 'VARCHAR(50)' },
      { name: 'fees_breakdown', type: 'JSONB' },
      { name: 'authorization_code', type: 'VARCHAR(255)' },
      { name: 'customer_email', type: 'VARCHAR(255)' },
      { name: 'customer_name', type: 'VARCHAR(255)' },
      { name: 'customer_phone', type: 'VARCHAR(20)' },
      { name: 'event_id', type: 'INTEGER' },
      { name: 'user_id', type: 'INTEGER' },
      { name: 'initiated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'paid_at', type: 'TIMESTAMP' },
      { name: 'verified_at', type: 'TIMESTAMP' },
      { name: 'metadata', type: 'JSONB' }
    ];
    
    // Check which columns already exist
    const existingColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'payments'
    `);
    
    const existingColumnNames = existingColumns.rows.map(row => row.column_name);
    console.log('📋 Existing columns:', existingColumnNames.join(', '));
    
    // Add missing columns
    console.log('⚡ Adding Paystack columns...');
    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        try {
          const sql = `ALTER TABLE payments ADD COLUMN ${column.name} ${column.type}`;
          await client.query(sql);
          console.log(`   ✅ Added column: ${column.name}`);
        } catch (error) {
          console.log(`   ⚠️  Column ${column.name} might already exist: ${error.message}`);
        }
      } else {
        console.log(`   ⏭️  Column ${column.name} already exists`);
      }
    }
    
    // Add unique constraint for paystack_reference
    try {
      await client.query(`
        ALTER TABLE payments 
        ADD CONSTRAINT unique_paystack_reference 
        UNIQUE (paystack_reference)
      `);
      console.log('   ✅ Added unique constraint for paystack_reference');
    } catch (error) {
      console.log('   ⚠️  Unique constraint might already exist:', error.message);
    }
    
    // Add foreign key constraints
    console.log('⚡ Adding foreign key constraints...');
    
    try {
      await client.query(`
        ALTER TABLE payments 
        ADD CONSTRAINT fk_payments_event_id 
        FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
      `);
      console.log('   ✅ Added foreign key constraint for event_id');
    } catch (error) {
      console.log('   ⚠️  Foreign key constraint for event_id might already exist:', error.message);
    }
    
    try {
      await client.query(`
        ALTER TABLE payments 
        ADD CONSTRAINT fk_payments_user_id 
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      `);
      console.log('   ✅ Added foreign key constraint for user_id');
    } catch (error) {
      console.log('   ⚠️  Foreign key constraint for user_id might already exist:', error.message);
    }
    
    // Create indexes
    console.log('⚡ Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_payments_paystack_reference ON payments(paystack_reference)',
      'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status)',
      'CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_event_id ON payments(event_id)'
    ];
    
    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
        console.log(`   ✅ Created index`);
      } catch (error) {
        console.log(`   ⚠️  Index might already exist: ${error.message}`);
      }
    }
    
    // Create trigger function
    console.log('⚡ Creating trigger function...');
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION update_payments_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      console.log('   ✅ Created update trigger function');
    } catch (error) {
      console.log('   ⚠️  Trigger function error:', error.message);
    }
    
    // Create trigger
    try {
      await client.query('DROP TRIGGER IF EXISTS update_payments_updated_at_trigger ON payments');
      await client.query(`
        CREATE TRIGGER update_payments_updated_at_trigger
            BEFORE UPDATE ON payments
            FOR EACH ROW
            EXECUTE FUNCTION update_payments_updated_at()
      `);
      console.log('   ✅ Created update trigger');
    } catch (error) {
      console.log('   ⚠️  Trigger error:', error.message);
    }
    
    // Create view
    console.log('⚡ Creating payment summary view...');
    try {
      await client.query(`
        CREATE OR REPLACE VIEW payment_summary AS
        SELECT 
            p.payment_id,
            p.paystack_reference,
            p.transaction_id,
            p.amount,
            p.currency,
            p.payment_status,
            p.payment_method,
            p.customer_email,
            p.customer_name,
            p.initiated_at,
            p.paid_at,
            p.payment_date,
            e.event_title,
            e.event_date,
            u.full_name as user_name
        FROM payments p
        LEFT JOIN events e ON p.event_id = e.event_id
        LEFT JOIN users u ON p.user_id = u.user_id
        ORDER BY p.initiated_at DESC
      `);
      console.log('   ✅ Created payment summary view');
    } catch (error) {
      console.log('   ⚠️  View error:', error.message);
    }
    
    // Verify final schema
    const finalColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'payments'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Final payments table schema:');
    finalColumns.rows.forEach(col => {
      const isNew = !existingColumnNames.includes(col.column_name);
      console.log(`   ${isNew ? '🆕' : '📌'} ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n🎉 Paystack integration database setup complete!');
    console.log('\n📋 What was added:');
    console.log('   • Paystack-specific columns for payment processing');
    console.log('   • Foreign key relationships to events and users');
    console.log('   • Indexes for better query performance');
    console.log('   • Auto-update trigger for timestamps');
    console.log('   • payment_summary view for reporting');
    console.log('\n🔧 Next steps:');
    console.log('   1. ✅ Paystack keys already configured in .env');
    console.log('   2. Restart your backend server');
    console.log('   3. Test the payment integration');
    
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
runPaystackMigration()
  .then(() => {
    console.log('✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
