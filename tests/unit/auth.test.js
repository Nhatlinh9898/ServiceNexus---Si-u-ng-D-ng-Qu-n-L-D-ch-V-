// Authentication Tests
// Test JWT middleware and authentication logic

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { AppError } = require('../../server/middleware/errorHandler');
const { protect, restrictTo, checkOrganizationAccess, signToken } = require('../../server/middleware/auth');

describe('Authentication Middleware', () => {
  let testUser;
  let testToken;

  beforeEach(async () => {
    // Create test user
    testUser = await global.testUtils.createTestUser();
    testToken = global.testUtils.generateTestToken(testUser.id);
  });

  describe('protect middleware', () => {
    it('should allow access with valid token', async () => {
      const req = global.testUtils.createMockRequest({
        headers: {
          authorization: `Bearer ${testToken}`
        }
      });
      const res = global.testUtils.createMockResponse();
      const next = global.testUtils.createMockNext();

      // Mock database queries
      const mockQuery = jest.fn();
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: testUser.id,
          email: testUser.email,
          role: testUser.role,
          is_active: true
        }]
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          is_active: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }]
      });

      global.testUtils.pool.query = mockQuery;

      await protect(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUser.id);
    });

    it('should reject request without token', async () => {
      const req = global.testUtils.createMockRequest();
      const res = global.testUtils.createMockResponse();
      const next = global.testUtils.createMockNext();

      await protect(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AppError),
        expect.any(Object)
      );
    });

    it('should reject request with invalid token', async () => {
      const req = global.testUtils.createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });
      const res = global.testUtils.createMockResponse();
      const next = global.testUtils.createMockNext();

      await protect(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AppError),
        expect.any(Object)
      );
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired token
      );

      const req = global.testUtils.createMockRequest({
        headers: {
          authorization: `Bearer ${expiredToken}`
        }
      });
      const res = global.testUtils.createMockResponse();
      const next = global.testUtils.createMockNext();

      await protect(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AppError),
        expect.any(Object)
      );
    });

    it('should reject request for inactive user', async () => {
      const req = global.testUtils.createMockRequest({
        headers: {
          authorization: `Bearer ${testToken}`
        }
      });
      const res = global.testUtils.createMockResponse();
      const next = global.testUtils.createMockNext();

      // Mock inactive user
      const mockQuery = jest.fn();
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: testUser.id,
          email: testUser.email,
          role: testUser.role,
          is_active: false // Inactive user
        }]
      });

      global.testUtils.pool.query = mockQuery;

      await protect(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AppError),
        expect.any(Object)
      );
    });
  });

  describe('restrictTo middleware', () => {
    it('should allow access for authorized roles', () => {
      const req = global.testUtils.createMockRequest({
        user: { role: 'ADMIN' }
      });
      const res = global.testUtils.createMockResponse();
      const next = global.testUtils.createMockNext();

      const middleware = restrictTo('ADMIN', 'SUPER_ADMIN');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject access for unauthorized roles', () => {
      const req = global.testUtils.createMockRequest({
        user: { role: 'USER' }
      });
      const res = global.testUtils.createMockResponse();
      const next = global.testUtils.createMockNext();

      const middleware = restrictTo('ADMIN', 'SUPER_ADMIN');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AppError),
        expect.any(Object)
      );
    });
  });

  describe('checkOrganizationAccess middleware', () => {
    let testOrg;

    beforeEach(async () => {
      testOrg = await global.testUtils.createTestOrganization();
    });

    it('should allow access for super admin', async () => {
      const req = global.testUtils.createMockRequest({
        user: { role: 'SUPER_ADMIN' },
        params: { organization_id: testOrg.id }
      });
      const res = global.testUtils.createMockResponse();
      const next = global.testUtils.createMockNext();

      await checkOrganizationAccess(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access for organization member', async () => {
      const req = global.testUtils.createMockRequest({
        user: { role: 'USER', id: testUser.id },
        params: { organization_id: testOrg.id }
      });
      const res = global.testUtils.createMockResponse();
      const next = global.testUtils.createMockNext();

      // Mock organization membership
      const mockQuery = jest.fn();
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'member-id' }]
      });

      global.testUtils.pool.query = mockQuery;

      await checkOrganizationAccess(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject access for non-member', async () => {
      const req = global.testUtils.createMockRequest({
        user: { role: 'USER', id: testUser.id },
        params: { organization_id: testOrg.id }
      });
      const res = global.testUtils.createMockResponse();
      const next = global.testUtils.createMockNext();

      // Mock no organization membership
      const mockQuery = jest.fn();
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      global.testUtils.pool.query = mockQuery;

      await checkOrganizationAccess(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(AppError),
        expect.any(Object)
      );
    });
  });

  describe('signToken function', () => {
    it('should generate valid JWT token', () => {
      const token = signToken(testUser.id);
      
      expect(typeof token).toBe('string');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(testUser.id);
    });

    it('should include expiration in token', () => {
      const token = signToken(testUser.id);
      const decoded = jwt.decode(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });
});

describe('Authentication Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
        role: 'USER'
      };

      const response = await request('http://localhost:3001')
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject registration with duplicate email', async () => {
      const userData = {
        email: testUser.email, // Existing email
        password: 'password123',
        first_name: 'Test',
        last_name: 'User'
      };

      const response = await request('http://localhost:3001')
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('fail');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'weak@example.com',
        password: '123', // Too short
        first_name: 'Test',
        last_name: 'User'
      };

      const response = await request('http://localhost:3001')
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: testUser.email,
        password: 'password123' // This should match the test user's password hash
      };

      // Mock password verification
      const originalBcryptCompare = bcrypt.compare;
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const response = await request('http://localhost:3001')
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.token).toBeDefined();

      // Restore original function
      bcrypt.compare = originalBcryptCompare;
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      // Mock password verification failure
      const originalBcryptCompare = bcrypt.compare;
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const response = await request('http://localhost:3001')
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.status).toBe('fail');

      // Restore original function
      bcrypt.compare = originalBcryptCompare;
    });

    it('should reject login for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request('http://localhost:3001')
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      const response = await request('http://localhost:3001')
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should reject logout without token', async () => {
      const response = await request('http://localhost:3001')
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      // Mock session validation
      const mockQuery = jest.fn();
      mockQuery.mockResolvedValueOnce({
        rows: [{
          is_active: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }]
      });

      global.testUtils.pool.query = mockQuery;

      const response = await request('http://localhost:3001')
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should reject profile request without token', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });
});
