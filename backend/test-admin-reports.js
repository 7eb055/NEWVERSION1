const axios = require('axios');

async function testAdminReports() {
  try {
    // First, login as admin to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@eventsystem.com',
      password: 'AdminEventSystem2025!'
    });

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');

    // Test dashboard stats
    const dashboardResponse = await axios.get('http://localhost:5000/api/admin/dashboard-stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Dashboard stats:', dashboardResponse.data);

    // Test reports
    const reportsResponse = await axios.get('http://localhost:5000/api/admin/reports', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Reports data:', JSON.stringify(reportsResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAdminReports();
