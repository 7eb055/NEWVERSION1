require('dotenv').config();

console.log('🔍 Environment Check:');
console.log('PAYSTACK_SECRET_KEY exists:', !!process.env.PAYSTACK_SECRET_KEY);
console.log('Key type:', process.env.PAYSTACK_SECRET_KEY?.substring(0, 7));
console.log('PAYSTACK_PUBLIC_KEY exists:', !!process.env.PAYSTACK_PUBLIC_KEY);
console.log('Public key type:', process.env.PAYSTACK_PUBLIC_KEY?.substring(0, 7));

// Test basic API connection
const axios = require('axios');

async function testPaystackConnection() {
  try {
    const response = await axios.get('https://api.paystack.co/bank', {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('✅ Paystack API connection successful');
    console.log('Status:', response.status);
  } catch (error) {
    console.log('❌ Paystack API connection failed');
    console.log('Error:', error.response?.data || error.message);
  }
}

testPaystackConnection();
