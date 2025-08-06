// Test script to verify the ticket purchase API endpoint
const axios = require('axios');

const testTicketPurchase = async () => {
  try {
    // Mock data for testing
    const eventId = 1; // Use an existing event ID
    const ticketTypeId = 1; // Use an existing ticket type ID
    const token = 'your-test-jwt-token'; // Replace with a valid token
    
    const purchaseData = {
      ticket_type_id: ticketTypeId,
      ticket_quantity: 1,
      payment_method: 'credit_card',
      payment_status: 'completed'
    };
    
    console.log('Testing ticket purchase API...');
    console.log('Event ID:', eventId);
    console.log('Purchase data:', purchaseData);
    
    const response = await axios.post(`http://localhost:5000/api/events/${eventId}/register`, purchaseData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.registration) {
      console.log('✅ Ticket purchase API test successful!');
      console.log('Registration ID:', response.data.registration.registration_id);
      console.log('QR Code:', response.data.registration.qr_code);
    } else {
      console.log('❌ API response missing registration data');
    }
    
  } catch (error) {
    console.error('❌ API Test Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
};

// Note: This is a test script - uncomment and run with valid data
// testTicketPurchase();

console.log('Ticket purchase API test script created.');
console.log('To test:');
console.log('1. Start your backend server');
console.log('2. Update the eventId, ticketTypeId, and token variables');
console.log('3. Uncomment the testTicketPurchase() call');
console.log('4. Run: node test-ticket-purchase.js');
