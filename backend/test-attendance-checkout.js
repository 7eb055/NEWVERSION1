// test-attendance-checkout.js
/**
 * End-to-End Test Script for Attendance Checkout Functionality
 * 
 * This script tests various checkout scenarios to ensure the enhanced checkout
 * functionality works correctly.
 * 
 * To run this test:
 * 1. Make sure your backend server is running
 * 2. Run: node test-attendance-checkout.js
 */

const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000';
const EVENT_ID = process.env.TEST_EVENT_ID || 6; // Replace with a valid event ID
let AUTH_TOKEN = ''; // Will be populated after login

// Test user credentials
const TEST_USER = {
  email: 'organizer@test.com', // Replace with valid organizer credentials
  password: 'password123'      // Replace with valid password
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Log with timestamp and color
const log = (message, color = colors.reset) => {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
};

// Log success message
const success = (message) => log(`✓ ${message}`, colors.green);

// Log error message
const error = (message) => log(`✗ ${message}`, colors.red);

// Log info message
const info = (message) => log(`ℹ ${message}`, colors.blue);

// Log warning message
const warn = (message) => log(`⚠ ${message}`, colors.yellow);

// Log test step
const step = (message) => log(`\n>> ${message}`, colors.cyan + colors.bright);

// Login and get authentication token
async function login() {
  step('Logging in to get authentication token');
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, TEST_USER);
    AUTH_TOKEN = response.data.token;
    success('Successfully logged in and got authentication token');
    return true;
  } catch (err) {
    error(`Login failed: ${err.message}`);
    if (err.response) {
      error(`Response data: ${JSON.stringify(err.response.data)}`);
    }
    return false;
  }
}

// Get list of attendees for the event
async function getAttendees() {
  step('Getting attendees for the event');
  
  try {
    const response = await axios.get(
      `${API_URL}/api/events/${EVENT_ID}/attendee-listing`,
      { headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } }
    );
    
    if (response.data.attendees && response.data.attendees.length > 0) {
      success(`Retrieved ${response.data.attendees.length} attendees`);
      return response.data.attendees;
    } else {
      warn('No attendees found for this event');
      return [];
    }
  } catch (err) {
    error(`Failed to get attendees: ${err.message}`);
    if (err.response) {
      error(`Response data: ${JSON.stringify(err.response.data)}`);
    }
    return [];
  }
}

// Check in an attendee
async function checkInAttendee(registrationId) {
  step(`Checking in attendee with registration ID: ${registrationId}`);
  
  try {
    const response = await axios.post(
      `${API_URL}/api/events/${EVENT_ID}/attendance/manual`,
      { registration_id: registrationId },
      { headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } }
    );
    
    success(`Check-in successful: ${JSON.stringify(response.data)}`);
    return true;
  } catch (err) {
    error(`Check-in failed: ${err.message}`);
    if (err.response) {
      error(`Response data: ${JSON.stringify(err.response.data)}`);
    }
    return false;
  }
}

// Check out an attendee
async function checkOutAttendee(registrationId) {
  step(`Checking out attendee with registration ID: ${registrationId}`);
  
  try {
    const response = await axios.post(
      `${API_URL}/api/events/${EVENT_ID}/attendance/checkout`,
      { registration_id: registrationId },
      { headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } }
    );
    
    success(`Check-out successful: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (err) {
    error(`Check-out failed: ${err.message}`);
    if (err.response) {
      error(`Response data: ${JSON.stringify(err.response.data)}`);
    }
    return null;
  }
}

// Get attendance history
async function getAttendanceHistory() {
  step('Getting attendance history');
  
  try {
    const response = await axios.get(
      `${API_URL}/api/events/${EVENT_ID}/attendance/history`,
      { headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } }
    );
    
    if (response.data.history && response.data.history.length > 0) {
      success(`Retrieved ${response.data.history.length} history records`);
      return response.data.history;
    } else {
      warn('No attendance history found for this event');
      return [];
    }
  } catch (err) {
    error(`Failed to get attendance history: ${err.message}`);
    if (err.response) {
      error(`Response data: ${JSON.stringify(err.response.data)}`);
    }
    return [];
  }
}

// Test normal check-in/check-out flow
async function testNormalFlow(attendee) {
  step('TESTING NORMAL CHECK-IN/CHECK-OUT FLOW');
  info(`Using attendee: ${attendee.attendee_name} (ID: ${attendee.registration_id})`);
  
  // First check in
  const checkInResult = await checkInAttendee(attendee.registration_id);
  if (!checkInResult) {
    warn('Skipping check-out test since check-in failed');
    return false;
  }
  
  // Then check out
  const checkOutResult = await checkOutAttendee(attendee.registration_id);
  return !!checkOutResult;
}

// Test checking out an already checked-out attendee
async function testDoubleCheckout(attendee) {
  step('TESTING DOUBLE CHECK-OUT SCENARIO');
  info(`Using attendee: ${attendee.attendee_name} (ID: ${attendee.registration_id})`);
  
  // First check in
  await checkInAttendee(attendee.registration_id);
  
  // First check out
  await checkOutAttendee(attendee.registration_id);
  
  // Second check out (should handle gracefully)
  const result = await checkOutAttendee(attendee.registration_id);
  return !!result; // Should still return a result, even if it's a forced checkout
}

// Test checking out an attendee who was never checked in
async function testCheckoutWithoutCheckin(attendee) {
  step('TESTING CHECK-OUT WITHOUT CHECK-IN SCENARIO');
  info(`Using attendee: ${attendee.attendee_name} (ID: ${attendee.registration_id})`);
  
  // Try to check out without checking in
  const result = await checkOutAttendee(attendee.registration_id);
  return !!result; // Should still return a result, handling the edge case
}

// Main test function
async function runTests() {
  log('\n====== ATTENDANCE CHECKOUT SYSTEM TEST ======\n', colors.bright + colors.cyan);
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    error('Cannot proceed with tests due to login failure');
    return;
  }
  
  // Get attendees
  const attendees = await getAttendees();
  if (attendees.length < 3) {
    error('Need at least 3 attendees to run all tests');
    return;
  }
  
  // Run tests
  const normalFlowSuccess = await testNormalFlow(attendees[0]);
  const doubleCheckoutSuccess = await testDoubleCheckout(attendees[1]);
  const checkoutWithoutCheckinSuccess = await testCheckoutWithoutCheckin(attendees[2]);
  
  // Get history to verify
  const history = await getAttendanceHistory();
  
  // Print test summary
  log('\n====== TEST SUMMARY ======\n', colors.bright + colors.cyan);
  log(`Normal Flow Test: ${normalFlowSuccess ? '✓ PASS' : '✗ FAIL'}`, normalFlowSuccess ? colors.green : colors.red);
  log(`Double Checkout Test: ${doubleCheckoutSuccess ? '✓ PASS' : '✗ FAIL'}`, doubleCheckoutSuccess ? colors.green : colors.red);
  log(`Checkout Without Check-in Test: ${checkoutWithoutCheckinSuccess ? '✓ PASS' : '✗ FAIL'}`, checkoutWithoutCheckinSuccess ? colors.green : colors.red);
  
  if (history.length > 0) {
    success(`Found ${history.length} attendance records in history`);
  } else {
    warn('No attendance records found in history');
  }
  
  log('\n====== END OF TESTS ======\n', colors.bright + colors.cyan);
}

// Run the tests
runTests().catch(err => {
  error(`Unhandled error: ${err.message}`);
  console.error(err);
});
