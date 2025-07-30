const axios = require('axios');

// Test the /api/events/my-events endpoint
async function testOrganizerEvents() {
  try {
    // This is a test without authentication - should return 401
    const response = await axios.get('http://localhost:5000/api/events/my-events');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Endpoint exists and correctly requires authentication');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data.message);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

console.log('Testing organizer-specific events endpoint...');
testOrganizerEvents();
