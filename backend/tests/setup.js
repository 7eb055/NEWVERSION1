// Jest setup file for backend tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'event_management_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Set test timeout
jest.setTimeout(10000);

// Cleanup after each test
afterEach(async () => {
  // Clean up database connections if needed
  // await db.cleanup();
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Mock external services for testing
jest.mock('../services/EmailService', () => ({
  sendEmail: jest.fn(),
  sendEventReminder: jest.fn(),
  sendRegistrationConfirmation: jest.fn(),
}));

jest.mock('../services/PaystackService', () => ({
  initializePayment: jest.fn(),
  verifyPayment: jest.fn(),
  verifyWebhookSignature: jest.fn(),
}));
