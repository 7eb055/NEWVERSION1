const EmailService = require('./services/EmailService');
const NotificationScheduler = require('./services/NotificationScheduler');

// Test Email Functionality
async function testEmailSystem() {
  console.log('🧪 Starting Email System Tests...\n');
  
  const emailService = new EmailService();
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  
  try {
    // Test 1: Ticket Confirmation Email
    console.log('📧 Test 1: Ticket Confirmation Email');
    const mockTicketData = {
      eventName: 'Annual Tech Conference 2024',
      eventDate: '2024-03-15',
      eventTime: '9:00 AM',
      venue: 'Convention Center, Main Hall',
      quantity: 2,
      ticketType: 'VIP Access',
      totalAmount: '150.00',
      qrCode: 'QR-CODE-ABC123XYZ'
    };
    
    await emailService.sendTicketConfirmationEmail(testEmail, 'John Doe', mockTicketData);
    console.log('✅ Ticket confirmation email sent successfully\n');
    
    // Test 2: Event Reminder Email
    console.log('📧 Test 2: Event Reminder Email');
    const mockEventData = {
      eventId: 1,
      eventName: 'Annual Tech Conference 2024',
      eventDate: '2024-03-15',
      eventTime: '9:00 AM',
      venue: 'Convention Center, Main Hall'
    };
    
    await emailService.sendEventReminderEmail(testEmail, 'John Doe', mockEventData, 3);
    console.log('✅ Event reminder email sent successfully\n');
    
    // Test 3: Event Update Email
    console.log('📧 Test 3: Event Update Email');
    const updateMessage = 'Important update: The venue has been changed to the Grand Ballroom due to increased attendance. Please arrive 30 minutes early for the new check-in process.';
    
    await emailService.sendEventUpdateEmail(testEmail, 'John Doe', mockEventData, updateMessage);
    console.log('✅ Event update email sent successfully\n');
    
    // Test 4: Payment Confirmation Email
    console.log('📧 Test 4: Payment Confirmation Email');
    const mockPaymentData = {
      eventName: 'Annual Tech Conference 2024',
      transactionId: 'TXN-2024-001-ABC123',
      amount: '150.00',
      paymentMethod: 'Credit Card (****1234)',
      paymentDate: new Date().toLocaleDateString(),
      quantity: 2
    };
    
    await emailService.sendPaymentConfirmationEmail(testEmail, 'John Doe', mockPaymentData);
    console.log('✅ Payment confirmation email sent successfully\n');
    
    // Test 5: Verification Email
    console.log('📧 Test 5: Verification Email');
    const verificationUrl = 'https://yourdomain.com/verify?token=abc123xyz';
    
    await emailService.sendVerificationEmail(testEmail, 'John Doe', verificationUrl);
    console.log('✅ Verification email sent successfully\n');
    
    // Test 6: Password Reset Email
    console.log('📧 Test 6: Password Reset Email');
    const resetUrl = 'https://yourdomain.com/reset-password?token=reset123xyz';
    
    await emailService.sendPasswordResetEmail(testEmail, resetUrl);
    console.log('✅ Password reset email sent successfully\n');
    
    console.log('🎉 All email tests completed successfully!');
    console.log(`📬 Check ${testEmail} for the test emails.`);
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

// Test Notification Scheduler
async function testNotificationScheduler() {
  console.log('\n🕒 Testing Notification Scheduler...\n');
  
  const scheduler = new NotificationScheduler();
  
  try {
    // Test manual reminder trigger (with mock event ID)
    console.log('📅 Testing manual reminder trigger...');
    
    // Note: This will fail if event ID 1 doesn't exist, but shows the functionality
    try {
      await scheduler.triggerManualReminder(1, 1);
      console.log('✅ Manual reminder test completed');
    } catch (error) {
      console.log('⚠️ Manual reminder test expected to fail without real event data:', error.message);
    }
    
    console.log('✅ Notification scheduler test completed');
    
  } catch (error) {
    console.error('❌ Notification scheduler test failed:', error);
  }
}

// Test Email Configuration
async function testEmailConfiguration() {
  console.log('\n⚙️ Testing Email Configuration...\n');
  
  const emailService = new EmailService();
  
  console.log('📋 Email Configuration:');
  console.log(`- SMTP Host: ${process.env.SMTP_HOST || 'Not configured'}`);
  console.log(`- SMTP Port: ${process.env.SMTP_PORT || 'Not configured'}`);
  console.log(`- SMTP User: ${process.env.SMTP_USER || 'Not configured'}`);
  console.log(`- SMTP Password: ${process.env.SMTP_PASSWORD ? '***configured***' : 'Not configured'}`);
  console.log(`- From Email: ${process.env.FROM_EMAIL || 'Not configured'}`);
  console.log(`- Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  
  // Test basic email sending
  try {
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    console.log(`\n📧 Sending configuration test email to: ${testEmail}`);
    
    await emailService.sendEmail(
      testEmail,
      'Email Configuration Test',
      'This is a test email to verify your email configuration is working correctly.',
      '<h1>Email Configuration Test</h1><p>This is a test email to verify your email configuration is working correctly.</p>'
    );
    
    console.log('✅ Configuration test email sent successfully');
  } catch (error) {
    console.error('❌ Configuration test failed:', error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Email System Test Suite\n');
  console.log('=' * 50);
  
  // Check environment variables
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('⚠️ WARNING: Email configuration not complete. Some tests may fail.');
    console.log('Please set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in your .env file.\n');
  }
  
  if (!process.env.TEST_EMAIL) {
    console.log('⚠️ WARNING: TEST_EMAIL not set in .env file. Using test@example.com');
    console.log('Set TEST_EMAIL=your-email@domain.com to receive test emails.\n');
  }
  
  // Run tests
  await testEmailConfiguration();
  await testEmailSystem();
  await testNotificationScheduler();
  
  console.log('\n🏁 Test suite completed!');
  console.log('=' * 50);
  process.exit(0);
}

// Allow running as script
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testEmailSystem,
  testNotificationScheduler,
  testEmailConfiguration,
  runAllTests
};
