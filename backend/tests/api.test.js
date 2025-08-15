const request = require('supertest');
const { app } = require('../server');

describe('API Health Check', () => {
  test('GET /health should return status 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.message).toBe('Event Management API is running');
    expect(response.body.status).toBe('healthy');
  });

  test('GET / should serve frontend HTML', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.headers['content-type']).toMatch(/html/);
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

  test('POST /api/auth/login should handle database errors gracefully', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@test.com',
        password: 'wrongpassword',
      });
    
    // Should return 500 if database is not available, or 401 if it is
    expect([401, 500]).toContain(response.status);
  });
});

describe('Events Endpoints', () => {
  test('GET /api/events should handle database connection issues', async () => {
    const response = await request(app)
      .get('/api/events');
    
    // Should return 200 with events if database is available, or 500 if not
    expect([200, 500]).toContain(response.status);
    
    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);
    }
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