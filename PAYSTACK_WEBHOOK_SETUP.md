# 🔗 Paystack Webhook Configuration Guide

## ✅ Current Status
Your backend already has a complete Paystack webhook implementation! The issue is likely that the webhook URL isn't configured in your Paystack dashboard.

## 🚀 **Step 1: Configure Webhook URL in Paystack Dashboard**

1. **Login to Paystack Dashboard**:
   - Go to [dashboard.paystack.com](https://dashboard.paystack.com)
   - Navigate to **Settings** → **Webhooks**

2. **Add Your Webhook URL**:
   ```
   http://your-domain.com/api/payments/webhook
   
   For local development:
   http://localhost:5000/api/payments/webhook
   
   For production:
   https://your-production-domain.com/api/payments/webhook
   ```

3. **Select Events to Subscribe To**:
   - ✅ `charge.success` (payment successful)
   - ✅ `charge.failed` (payment failed)

## 🧪 **Step 2: Test Webhook Locally (Using ngrok)**

Since Paystack needs a public URL, use ngrok for local testing:

### Install ngrok:
```bash
# Download from ngrok.com or use npm
npm install -g ngrok
```

### Expose your local server:
```bash
# In a new terminal, expose port 5000
ngrok http 5000
```

### Update Paystack webhook URL:
```
https://your-ngrok-subdomain.ngrok.io/api/payments/webhook
```

## 🔍 **Step 3: Manual Payment Status Update (Immediate Fix)**

While you configure the webhook, here's a script to manually update pending payments:

```javascript
// Create: backend/fix-pending-payments.js
const { Pool } = require('pg');
const PaystackService = require('./services/PaystackService');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fixPendingPayments() {
  try {
    // Get pending payments from today
    const pendingPayments = await pool.query(`
      SELECT payment_id, paystack_reference, amount, customer_email, initiated_at
      FROM payments 
      WHERE payment_status = 'pending' 
      AND initiated_at >= CURRENT_DATE
      ORDER BY initiated_at DESC
    `);
    
    console.log(`Found ${pendingPayments.rows.length} pending payments`);
    
    for (const payment of pendingPayments.rows) {
      console.log(`\\n💳 Checking payment: ${payment.paystack_reference}`);
      
      try {
        const verification = await PaystackService.verifyTransaction(payment.paystack_reference);
        
        if (verification.status === 'success') {
          console.log('✅ Payment confirmed successful - updating database...');
          
          await pool.query(`
            UPDATE payments 
            SET payment_status = 'success',
                paid_at = NOW(),
                verified_at = NOW()
            WHERE payment_id = $1
          `, [payment.payment_id]);
          
          console.log('✅ Payment updated successfully!');
        } else {
          console.log(`⏳ Payment still ${verification.status}`);
        }
      } catch (error) {
        console.log(`❌ Error verifying: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixPendingPayments();
```

## 📊 **Step 4: Webhook Testing & Monitoring**

### Test webhook is working:
```bash
# Check webhook endpoint
curl -X POST http://localhost:5000/api/payments/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-paystack-signature: test" \\
  -d '{"event":"charge.success","data":{"reference":"test"}}'
```

### Monitor webhook logs:
```bash
# In your backend terminal, watch for webhook logs
tail -f your-app.log | grep "webhook"
```

## 🎯 **Why Your Payments Are Pending**

Your payments show as "pending" because:

1. **✅ Payment succeeds on Paystack** ← This works
2. **❌ Webhook not called** ← This is missing
3. **❌ Database not updated** ← So status stays "pending"

## 🔧 **Production Webhook Configuration**

For production, your webhook URL should be:
```
https://your-domain.com/api/payments/webhook
```

Make sure your production server:
- ✅ Has PAYSTACK_SECRET_KEY configured
- ✅ Can receive POST requests on /api/payments/webhook
- ✅ Has proper SSL/HTTPS setup

## 🚨 **Immediate Action Required**

1. **Configure webhook URL in Paystack dashboard**
2. **Run the fix script for existing pending payments**
3. **Test a new payment to confirm webhook works**

Once the webhook is configured, future payments will automatically update from "pending" to "success" when completed!
