// Test file to verify event endpoints
// Run this with: node test-events-api.js

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

async function testEventEndpoints() {
  console.log('🧪 Testing Event API Endpoints...\n');

  try {
    // Test 1: Get all published events
    console.log('📋 Testing GET /api/events (published events)...');
    const eventsResponse = await axios.get(`${API_BASE_URL}/api/events?status=published&limit=10`);
    console.log('✅ Success:', eventsResponse.status);
    console.log('📊 Events found:', eventsResponse.data.length);
    
    if (eventsResponse.data.length > 0) {
      const firstEvent = eventsResponse.data[0];
      console.log('📌 Sample event:');
      console.log('   - ID:', firstEvent.event_id);
      console.log('   - Name:', firstEvent.event_name);
      console.log('   - Date:', firstEvent.event_date);
      console.log('   - Price:', firstEvent.ticket_price);
      console.log('   - Organizer:', firstEvent.organizer_name);
      console.log('   - Registrations:', firstEvent.registration_count);
      
      // Test 2: Get specific event details
      console.log('\n🔍 Testing GET /api/events/:id/details...');
      const detailsResponse = await axios.get(`${API_BASE_URL}/api/events/${firstEvent.event_id}/details`);
      console.log('✅ Success:', detailsResponse.status);
      console.log('📄 Event details received for:', detailsResponse.data.event_name);
    }
    
    // Test 3: Health check
    console.log('\n💊 Testing GET /health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Success:', healthResponse.status);
    console.log('🟢 Server status:', healthResponse.data.status);
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    } else if (error.request) {
      console.error('🌐 No response received - Check if backend server is running on', API_BASE_URL);
    }
  }
}

// Helper function to test authentication endpoints
async function testAuthEndpoints() {
  console.log('\n🔐 Testing Authentication Endpoints...\n');

  try {
    // Test login endpoint with dummy data (should fail gracefully)
    console.log('🔑 Testing POST /api/auth/login (invalid credentials)...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'wrongpassword'
    });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Login endpoint working (correctly rejected invalid credentials)');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

// Run tests
async function runAllTests() {
  await testEventEndpoints();
  await testAuthEndpoints();
  
  console.log('\n🎯 Test Summary:');
  console.log('   - Make sure your backend server is running on port 5000');
  console.log('   - Check that you have some published events in your database');
  console.log('   - Verify CORS is properly configured for frontend access');
}

runAllTests();
