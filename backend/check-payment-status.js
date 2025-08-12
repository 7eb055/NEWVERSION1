const { Pool } = require('pg');
const paystackService = require('./services/PaystackService');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkAndFixPayment() {
  try {
    // Get today's pending payments
    const result = await pool.query(`
      SELECT payment_id, paystack_reference, amount, customer_email, initiated_at
      FROM payments 
      WHERE payment_status = 'pending' 
      AND DATE(initiated_at) = CURRENT_DATE
      ORDER BY initiated_at DESC
    `);
    
    console.log(`🔍 Found ${result.rows.length} pending payment(s) from today`);
    
    if (result.rows.length === 0) {
      console.log('✅ No pending payments to check');
      return;
    }
    
    for (const payment of result.rows) {
      console.log(`\n💳 Checking: ${payment.paystack_reference}`);
      console.log(`💰 Amount: GH₵${payment.amount}`);
      console.log(`📧 Email: ${payment.customer_email}`);
      
      try {
        // Verify with Paystack
        const verification = await paystackService.verifyTransaction(payment.paystack_reference);
        
        console.log(`📋 Paystack Status: ${verification.status}`);
        
        if (verification.status === 'success') {
          console.log('✅ Payment confirmed successful! Updating database...');
          
          // Update payment status
          await pool.query(`
            UPDATE payments 
            SET payment_status = 'success',
                paid_at = NOW(),
                verified_at = NOW(),
                paystack_transaction_id = $1,
                gateway_response = $2,
                channel = $3
            WHERE payment_id = $4
          `, [
            verification.data.id,
            verification.gateway_response,
            verification.channel,
            payment.payment_id
          ]);
          
          console.log('🎉 Payment successfully updated to PAID status!');
          
        } else {
          console.log(`⏳ Payment status: ${verification.status} (not yet successful)`);
        }
        
      } catch (verifyError) {
        console.log(`❌ Error verifying with Paystack: ${verifyError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    console.log('\n✨ Check complete!');
  }
}

checkAndFixPayment();
