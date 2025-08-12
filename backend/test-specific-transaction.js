require('dotenv').config();
const axios = require('axios');

async function checkSpecificTransaction() {
  const reference = 'EVT_1754912912112_UZBVM4'; // Most recent one
  
  try {
    console.log(`🔍 Checking transaction: ${reference}`);
    
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('✅ Transaction found!');
    console.log('Status:', response.data.data.status);
    console.log('Amount:', response.data.data.amount / 100); // Paystack uses kobo
    console.log('Customer email:', response.data.data.customer.email);
    console.log('Gateway response:', response.data.data.gateway_response);
    
  } catch (error) {
    console.log('❌ Transaction not found in Paystack');
    console.log('Error:', error.response?.data || error.message);
    console.log('\n💡 This means:');
    console.log('1. The payment was never actually sent to Paystack');
    console.log('2. The reference was created but payment failed before reaching Paystack');
    console.log('3. The reference format is wrong');
  }
}

checkSpecificTransaction();
