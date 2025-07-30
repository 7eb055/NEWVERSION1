// Simple test script to check manual registration endpoint
const axios = require('axios');

async function testManualRegistration() {
  try {
    // Test data - you'll need to replace with actual event ID and token
    const testData = {
      email: 'test@example.com',
      full_name: 'Test User',
      phone: '+1-555-0123',
      ticket_quantity: 1,
      special_requirements: 'Test registration'
    };
    
    const eventId = 1; // Replace with actual event ID
    const token = 'your-jwt-token-here'; // Replace with actual token
    
    console.log('Testing manual registration endpoint...');
    console.log('URL:', `http://localhost:5000/api/events/${eventId}/manual-registration`);
    console.log('Data:', testData);
    
    const response = await axios.post(
      `http://localhost:5000/api/events/${eventId}/manual-registration`,
      testData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Success:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Error Response:', {
        status: error.response.status,
        message: error.response.data?.message,
        data: error.response.data
      });
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Uncomment to run test (make sure to provide valid event ID and token)
// testManualRegistration();

console.log('Manual registration test script ready');
console.log('Update eventId and token variables, then uncomment the function call to test');
