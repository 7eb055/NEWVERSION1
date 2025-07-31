const axios = require('axios');

async function checkDatabase() {
  try {
    // First, login as admin to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@eventsystem.com',
      password: 'AdminEventSystem2025!'
    });

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');

    // Check events endpoint directly in the database through an admin query
    const eventsResponse = await axios.get('http://localhost:5000/api/admin/events', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Admin events endpoint working, returned', eventsResponse.data.length, 'events');
    if (eventsResponse.data.length > 0) {
      console.log('Sample event:', JSON.stringify(eventsResponse.data[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkDatabase();
