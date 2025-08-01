const axios = require('axios');

// Test the missing attendance endpoints
async function testAttendanceEndpoints() {
  try {
    console.log('Testing attendance endpoints...\n');

    // Test endpoints without authentication first to see if they exist
    const endpoints = [
      '/api/events/6/attendee-listing',
      '/api/events/6/attendee-stats', 
      '/api/events/6/attendance/history',
      '/api/events/6/attendance/stats'
    ];

    for (const endpoint of endpoints) {
      try {
        await axios.get(`http://localhost:5000${endpoint}`);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log(`✅ ${endpoint} endpoint exists (requires auth)`);
        } else if (error.response && error.response.status === 404) {
          console.log(`❌ ${endpoint} endpoint missing (404)`);
        } else {
          console.log(`❌ ${endpoint} endpoint error:`, error.response?.status || error.message);
        }
      }
    }

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testAttendanceEndpoints();
