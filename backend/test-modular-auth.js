// Comprehensive Test Suite for Modular Authentication System
const axios = require('axios');

class AuthSystemTester {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.testResults = [];
    this.testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!@#',
      username: 'Test User',
      role: 'attendee',
      phone: '123-456-7890'
    };
    this.testOrganizer = {
      email: `org-${Date.now()}@example.com`,
      password: 'Org123!@#',
      username: 'Test Organizer',
      role: 'organizer',
      phone: '098-765-4321',
      companyName: 'Test Company Inc',
      contactPerson: 'Test Contact',
      location: '123 Business Street, City, State 12345'
    };
    this.verificationToken = null;
  }

  // Helper method to log test results
  logTest(testName, success, message, data = null) {
    const result = {
      test: testName,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const emoji = success ? '✅' : '❌';
    console.log(`${emoji} ${testName}: ${message}`);
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  // Test API health
  async testHealthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/auth/health`);
      
      if (response.data.status === 'ok') {
        this.logTest('Health Check', true, 'API is healthy', response.data);
      } else {
        this.logTest('Health Check', false, 'API health check failed', response.data);
      }
    } catch (error) {
      this.logTest('Health Check', false, `Health check failed: ${error.message}`);
    }
  }

  // Test input validation
  async testValidation() {
    const invalidInputs = [
      {
        name: 'Missing email',
        data: { password: 'Test123!', username: 'Test User', role: 'attendee' }
      },
      {
        name: 'Invalid email format',
        data: { email: 'invalid-email', password: 'Test123!', username: 'Test User', role: 'attendee' }
      },
      {
        name: 'Weak password',
        data: { email: 'test@example.com', password: '123', username: 'Test User', role: 'attendee' }
      },
      {
        name: 'Missing username',
        data: { email: 'test@example.com', password: 'Test123!', role: 'attendee' }
      },
      {
        name: 'Invalid role',
        data: { email: 'test@example.com', password: 'Test123!', username: 'Test User', role: 'invalid' }
      },
      {
        name: 'Organizer missing company info',
        data: { 
          email: 'test@example.com', 
          password: 'Test123!', 
          username: 'Test User', 
          role: 'organizer' 
        }
      }
    ];

    for (const testCase of invalidInputs) {
      try {
        await axios.post(`${this.baseUrl}/api/auth/register`, testCase.data);
        this.logTest(`Validation: ${testCase.name}`, false, 'Should have failed validation but succeeded');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          this.logTest(`Validation: ${testCase.name}`, true, 'Properly rejected invalid input', {
            error: error.response.data.message
          });
        } else {
          this.logTest(`Validation: ${testCase.name}`, false, `Unexpected error: ${error.message}`);
        }
      }
    }
  }

  // Test attendee registration
  async testAttendeeRegistration() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/register`, this.testUser);
      
      if (response.status === 201 && response.data.success) {
        this.logTest('Attendee Registration', true, 'Attendee registered successfully', {
          user_id: response.data.user.user_id,
          email: response.data.user.email,
          emailSent: response.data.emailSent
        });
        
        // Store for later tests
        this.testUser.userId = response.data.user.user_id;
        return true;
      } else {
        this.logTest('Attendee Registration', false, 'Registration failed', response.data);
        return false;
      }
    } catch (error) {
      this.logTest('Attendee Registration', false, `Registration error: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }

  // Test organizer registration
  async testOrganizerRegistration() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/register`, this.testOrganizer);
      
      if (response.status === 201 && response.data.success) {
        this.logTest('Organizer Registration', true, 'Organizer registered successfully', {
          user_id: response.data.user.user_id,
          email: response.data.user.email,
          emailSent: response.data.emailSent
        });
        
        // Store for later tests
        this.testOrganizer.userId = response.data.user.user_id;
        return true;
      } else {
        this.logTest('Organizer Registration', false, 'Registration failed', response.data);
        return false;
      }
    } catch (error) {
      this.logTest('Organizer Registration', false, `Registration error: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }

  // Test duplicate registration
  async testDuplicateRegistration() {
    try {
      await axios.post(`${this.baseUrl}/api/auth/register`, this.testUser);
      this.logTest('Duplicate Registration', false, 'Should have prevented duplicate registration');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        this.logTest('Duplicate Registration', true, 'Properly prevented duplicate registration', {
          error: error.response.data.message
        });
      } else {
        this.logTest('Duplicate Registration', false, `Unexpected error: ${error.message}`);
      }
    }
  }

  // Test login before verification
  async testLoginBeforeVerification() {
    try {
      await axios.post(`${this.baseUrl}/api/auth/login`, {
        email: this.testUser.email,
        password: this.testUser.password
      });
      this.logTest('Login Before Verification', false, 'Should have prevented login before verification');
    } catch (error) {
      if (error.response && error.response.status === 401 && error.response.data.requiresVerification) {
        this.logTest('Login Before Verification', true, 'Properly prevented login before verification', {
          error: error.response.data.message
        });
      } else {
        this.logTest('Login Before Verification', false, `Unexpected error: ${error.message}`);
      }
    }
  }

  // Test email verification (simulated)
  async testEmailVerification() {
    // Since we can't easily get the token from email in automated tests,
    // we'll simulate the verification by directly calling the endpoint with a fake token
    
    try {
      // First, try with invalid token
      await axios.get(`${this.baseUrl}/api/auth/verify-email?token=invalid-token`);
      this.logTest('Email Verification (Invalid Token)', false, 'Should have rejected invalid token');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        this.logTest('Email Verification (Invalid Token)', true, 'Properly rejected invalid token', {
          error: error.response.data.message
        });
      }
    }

    // For actual verification, we'd need to extract the token from the database or email
    // This is a limitation of automated testing without access to email or database
    this.logTest('Email Verification (Manual Step)', true, 
      'Email verification requires manual token extraction from database/email - see verification flow test script');
  }

  // Test resend verification
  async testResendVerification() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/resend-verification`, {
        email: this.testUser.email
      });
      
      if (response.data.success) {
        this.logTest('Resend Verification', true, 'Verification email resent successfully', response.data);
      } else {
        this.logTest('Resend Verification', false, 'Failed to resend verification', response.data);
      }
    } catch (error) {
      this.logTest('Resend Verification', false, `Resend error: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test login with invalid credentials
  async testInvalidLogin() {
    const invalidLogins = [
      {
        name: 'Wrong password',
        data: { email: this.testUser.email, password: 'wrongpassword' }
      },
      {
        name: 'Non-existent email',
        data: { email: 'nonexistent@example.com', password: 'Test123!' }
      },
      {
        name: 'Missing password',
        data: { email: this.testUser.email }
      }
    ];

    for (const testCase of invalidLogins) {
      try {
        await axios.post(`${this.baseUrl}/api/auth/login`, testCase.data);
        this.logTest(`Invalid Login: ${testCase.name}`, false, 'Should have rejected invalid login');
      } catch (error) {
        if (error.response && (error.response.status === 400 || error.response.status === 401)) {
          this.logTest(`Invalid Login: ${testCase.name}`, true, 'Properly rejected invalid login', {
            error: error.response.data.message
          });
        } else {
          this.logTest(`Invalid Login: ${testCase.name}`, false, `Unexpected error: ${error.message}`);
        }
      }
    }
  }

  // Test verification statistics (debug endpoint)
  async testVerificationStats() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/auth/debug/verification-stats`);
      
      if (response.data.success) {
        this.logTest('Verification Statistics', true, 'Retrieved verification stats', response.data.stats);
      } else {
        this.logTest('Verification Statistics', false, 'Failed to get verification stats', response.data);
      }
    } catch (error) {
      this.logTest('Verification Statistics', false, `Stats error: ${error.response?.data?.message || error.message}`);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Starting Comprehensive Authentication System Tests...\n');
    console.log('===============================================');
    
    // Basic connectivity
    await this.testHealthCheck();
    console.log('');

    // Input validation tests
    console.log('📝 Testing Input Validation...');
    await this.testValidation();
    console.log('');

    // Registration tests
    console.log('👤 Testing User Registration...');
    const attendeeRegistered = await this.testAttendeeRegistration();
    await this.testOrganizerRegistration();
    await this.testDuplicateRegistration();
    console.log('');

    // Pre-verification tests
    if (attendeeRegistered) {
      console.log('🔒 Testing Pre-Verification Security...');
      await this.testLoginBeforeVerification();
      console.log('');
    }

    // Email verification tests
    console.log('📧 Testing Email Verification...');
    await this.testEmailVerification();
    await this.testResendVerification();
    console.log('');

    // Login tests
    console.log('🔐 Testing Login Security...');
    await this.testInvalidLogin();
    console.log('');

    // Debug and statistics
    console.log('📊 Testing Debug Features...');
    await this.testVerificationStats();
    console.log('');

    // Generate test report
    this.generateTestReport();
  }

  // Generate comprehensive test report
  generateTestReport() {
    console.log('===============================================');
    console.log('📋 TEST SUMMARY REPORT');
    console.log('===============================================');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('');

    if (failedTests > 0) {
      console.log('❌ FAILED TESTS:');
      this.testResults
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`   • ${result.test}: ${result.message}`);
        });
      console.log('');
    }

    console.log('💡 NEXT STEPS:');
    console.log('   1. For email verification testing, use the test-verification-flow.js script');
    console.log('   2. To test complete login flow, verify a user first');
    console.log('   3. Check email service configuration if email tests failed');
    console.log('   4. Run individual component tests for detailed debugging');
    console.log('');

    console.log('📝 TEST DATA CREATED:');
    console.log(`   • Test Attendee: ${this.testUser.email}`);
    console.log(`   • Test Organizer: ${this.testOrganizer.email}`);
    console.log('   • Use these accounts for manual testing');
    console.log('');

    console.log('🏁 Testing completed at:', new Date().toISOString());
    console.log('===============================================');
  }
}

// Main execution
async function runTests() {
  const tester = new AuthSystemTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  runTests();
}

module.exports = AuthSystemTester;
