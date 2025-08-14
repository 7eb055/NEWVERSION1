const request = require('supertest');
const { app } = require('../server');

describe('API Health Check', () => {
  test('GET / should return status 200', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.body.message).toBe('Event Management API is running');
  });
});

describe('Authentication Endpoints', () => {
  test('POST /api/auth/register should require valid data', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: '123',
      });
    
    expect(response.status).toBe(400);
  });

  test('POST /api/auth/login should require valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@test.com',
        password: 'wrongpassword',
      });
    
    expect(response.status).toBe(401);
  });
});

describe('Events Endpoints', () => {
  test('GET /api/events should return events list', async () => {
    const response = await request(app)
      .get('/api/events')
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });
});

// Clean up database connections after all tests
afterAll(async () => {
  // Import pool here to avoid unused variable warning
  const { pool } = require('../server');
  if (pool) {
    await pool.end();
  }
});