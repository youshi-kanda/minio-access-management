const request = require('supertest');
const app = require('../server');

describe('File API Authentication', () => {
  describe('GET /api/auth/status', () => {
    it('should return authentication status', async () => {
      const response = await request(app)
        .get('/api/auth/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authenticated');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should redirect to admin in production', async () => {
      // Temporarily set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('admin interface');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should allow temporary login in development', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authCookie;

    beforeAll(async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'admin123'
        });
      
      authCookie = loginResponse.headers['set-cookie'];
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
});