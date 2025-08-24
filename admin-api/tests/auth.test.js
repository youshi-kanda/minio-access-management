const request = require('supertest');
const app = require('../server');

describe('Authentication API', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials in development', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'admin@example.com');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com'
          // missing password
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/status', () => {
    it('should return authentication status', async () => {
      const response = await request(app)
        .get('/api/auth/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authenticated');
      expect(response.body).toHaveProperty('hasGoogleOAuth');
    });
  });

  describe('GET /api/auth/config', () => {
    it('should return auth configuration', async () => {
      const response = await request(app)
        .get('/api/auth/config');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('googleOAuth');
      expect(response.body).toHaveProperty('temporaryAuth');
    });
  });
});