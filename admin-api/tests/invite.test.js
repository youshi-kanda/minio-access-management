const request = require('supertest');
const app = require('../server');

describe('Invitation API', () => {
  let authCookie;

  beforeAll(async () => {
    // Login to get session cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123'
      });
    
    authCookie = loginResponse.headers['set-cookie'];
  });

  describe('POST /api/invite', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/invite')
        .send({
          email: 'user@example.com',
          bucket: 'test-bucket',
          role: 'rw'
        });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/invite')
        .set('Cookie', authCookie)
        .send({
          email: 'user@example.com'
          // missing bucket
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/invite')
        .set('Cookie', authCookie)
        .send({
          email: 'invalid-email',
          bucket: 'test-bucket',
          role: 'rw'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email format');
    });

    it('should validate role values', async () => {
      const response = await request(app)
        .post('/api/invite')
        .set('Cookie', authCookie)
        .send({
          email: 'user@example.com',
          bucket: 'test-bucket',
          role: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Role must be either');
    });
  });

  describe('GET /api/invite', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/invite');

      expect(response.status).toBe(401);
    });

    it('should return invitations list when authenticated', async () => {
      const response = await request(app)
        .get('/api/invite')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('invitations');
      expect(Array.isArray(response.body.invitations)).toBe(true);
    });
  });

  describe('GET /api/invite/details/:token', () => {
    it('should return 404 for invalid token', async () => {
      const response = await request(app)
        .get('/api/invite/details/invalid-token');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/invite/accept', () => {
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/invite/accept')
        .send({
          token: 'test-token'
          // missing newSecret
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/invite/accept')
        .send({
          token: 'test-token',
          newSecret: '123' // too short
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 characters');
    });
  });
});