// Test JWT token validation
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create a test token
const testUser = {
  user_id: 1,
  email: 'test@example.com',
  role: 'attendee'
};

const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '24h' });
console.log('Generated test token:', token);

// Verify the token
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Token verification successful:', decoded);
} catch (error) {
  console.log('Token verification failed:', error.message);
}

console.log('JWT_SECRET:', JWT_SECRET);
