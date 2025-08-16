// Script to create organizer profile for existing user
const axios = require('axios');

const createOrganizerProfile = async () => {
  try {
    // Use the token from the logs - this user is already logged in
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6IjdlYjA1NUBnbWFpbC5jb20iLCJyb2xlIjoib3JnYW5pemVyIiwicm9sZXMiOltdLCJpYXQiOjE3NTUzMDUwMzYsImV4cCI6MTc1NTM5MTQzNn0.nEdThWIn0WNlvupvtDoo4J1_5t-UirONt7vO1p_tC8c';

    const organizerData = {
      fullName: 'Event Organizer',
      phone: '+1-555-0123',
      companyName: 'Event Management Co',
      businessAddress: 'New York, NY',
      jobTitle: 'Event Manager'
    };

    console.log('🚀 Creating organizer profile...');
    console.log('📊 Data:', organizerData);

    const response = await axios.post(
      'https://your-event-app-production-1c49193922fb.herokuapp.com/api/auth/setup-organizer',
      organizerData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Success:', response.data);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

createOrganizerProfile();
