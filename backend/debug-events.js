const axios = require('axios');

async function testSimpleQuery() {
  try {
    console.log('Testing simple events query...');

    // Test a very simple query first
    const response = await axios.get('http://localhost:5000/api/events?status=published&limit=5');
    console.log('✅ Events endpoint working!');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('❌ Error details:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data);
    
    // Let's try a direct test query
    try {
      console.log('\nTrying admin login to test database connection...');
      await axios.post('http://localhost:5000/api/auth/login', {
        email: 'admin@eventsystem.com',
        password: 'AdminEventSystem2025!'
      });
      console.log('✅ Database connection working via admin login');
    } catch (dbError) {
      console.log('❌ Database connection issue:', dbError.response?.data || dbError.message);
    }
  }
}

testSimpleQuery();
