const axios = require('axios');

async function testOrganizerEndpoints() {
  try {
    // Test endpoints without authentication first to see if they exist
    console.log('Testing organizer endpoints...\n');

    // Test my-events endpoint
    try {
      await axios.get('http://localhost:5000/api/events/my-events');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ /api/events/my-events endpoint exists (requires auth)');
      } else {
        console.log('❌ /api/events/my-events endpoint error:', error.response?.status || error.message);
      }
    }

    // Test companies endpoint
    try {
      await axios.get('http://localhost:5000/api/companies');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ /api/companies endpoint exists (requires auth)');
      } else {
        console.log('❌ /api/companies endpoint error:', error.response?.status || error.message);
      }
    }

    // Test attendees endpoint
    try {
      await axios.get('http://localhost:5000/api/attendees');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ /api/attendees endpoint exists (requires auth)');
      } else {
        console.log('❌ /api/attendees endpoint error:', error.response?.status || error.message);
      }
    }

    // Test general events endpoint
    try {
      const response = await axios.get('http://localhost:5000/api/events');
      console.log('✅ /api/events endpoint working, returned', response.data.length, 'events');
    } catch (error) {
      console.log('❌ /api/events endpoint error:', error.response?.status || error.message);
    }

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testOrganizerEndpoints();
