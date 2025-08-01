const axios = require('axios');

const API_URL = 'http://localhost:5000';

// Test the attendance endpoints with a mock JWT token
async function testAttendanceWithAuth() {
  console.log('🧪 Testing attendance endpoints with authentication...\n');
  
  // You would need to replace this with a real JWT token from a login
  // For testing purposes, you can login first and get the token
  const mockToken = 'your-jwt-token-here';
  
  const headers = {
    'Authorization': `Bearer ${mockToken}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test attendee listing
    console.log('Testing /api/events/6/attendee-listing...');
    const attendeesResponse = await axios.get(`${API_URL}/api/events/6/attendee-listing`, { headers });
    console.log('✅ Attendee listing response:', {
      success: attendeesResponse.data.success,
      totalAttendees: attendeesResponse.data.total,
      sampleAttendee: attendeesResponse.data.attendees?.[0] || 'No attendees'
    });
    
    // Test attendance stats
    console.log('\nTesting /api/events/6/attendee-stats...');
    const statsResponse = await axios.get(`${API_URL}/api/events/6/attendee-stats`, { headers });
    console.log('✅ Attendance stats response:', statsResponse.data);
    
    // Test scan history
    console.log('\nTesting /api/events/6/attendance/history...');
    const historyResponse = await axios.get(`${API_URL}/api/events/6/attendance/history`, { headers });
    console.log('✅ Scan history response:', {
      success: historyResponse.data.success,
      historyCount: historyResponse.data.history?.length || 0
    });
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❗ Authentication required - this is expected');
      console.log('💡 To test with authentication:');
      console.log('   1. Login to get a JWT token');
      console.log('   2. Replace mockToken with the real token');
      console.log('   3. Run this test again');
    } else {
      console.error('❌ Error testing endpoints:', error.message);
    }
  }
}

// Test without authentication to verify endpoints exist
async function testEndpointsExist() {
  console.log('🔍 Testing if endpoints exist (expect 401 responses)...\n');
  
  const endpoints = [
    '/api/events/6/attendee-listing',
    '/api/events/6/attendee-stats',
    '/api/events/6/attendance/stats',
    '/api/events/6/attendance/history'
  ];
  
  for (const endpoint of endpoints) {
    try {
      await axios.get(`${API_URL}${endpoint}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`✅ ${endpoint} - endpoint exists (401 Unauthorized as expected)`);
      } else {
        console.log(`❌ ${endpoint} - unexpected response: ${error.response?.status || error.message}`);
      }
    }
  }
}

// Run tests
async function runTests() {
  await testEndpointsExist();
  console.log('\n' + '='.repeat(50) + '\n');
  await testAttendanceWithAuth();
}

runTests();
