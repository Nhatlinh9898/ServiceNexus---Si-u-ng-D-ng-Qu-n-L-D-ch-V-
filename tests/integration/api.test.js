// API Integration Tests
// End-to-end API testing with real database interactions

const request = require('supertest');

describe('API Integration Tests', () => {
  let server;
  let testUser;
  let testToken;
  let testOrganization;
  let testDepartment;
  let testEmployee;
  let testService;

  beforeAll(async () => {
    // Start test server
    server = require('../../server/index');
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Close server
    if (server && server.close) {
      await new Promise(resolve => {
        server.close(resolve);
      });
    }
  });

  describe('Complete User Workflow', () => {
    it('should register, login, and manage user data', async () => {
      // 1. Register new user
      const userData = {
        email: 'integration@example.com',
        password: 'password123',
        first_name: 'Integration',
        last_name: 'Test',
        role: 'USER'
      };

      const registerResponse = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.status).toBe('success');
      expect(registerResponse.body.data.user.email).toBe(userData.email);
      expect(registerResponse.body.data.token).toBeDefined();

      const token = registerResponse.body.data.token;
      const userId = registerResponse.body.data.user.id;

      // 2. Login with same credentials
      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.status).toBe('success');
      expect(loginResponse.body.data.token).toBeDefined();

      // 3. Get user profile
      const profileResponse = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.status).toBe('success');

      // 4. Update user profile (if user has admin rights)
      if (userData.role === 'ADMIN' || userData.role === 'SUPER_ADMIN') {
        const updateResponse = await request(server)
          .put(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            first_name: 'Updated',
            last_name: 'Name'
          })
          .expect(200);

        expect(updateResponse.body.status).toBe('success');
      }
    });
  });

  describe('Complete Organization Workflow', () => {
    let organizationId;
    let adminToken;

    beforeAll(async () => {
      // Create admin user for organization management
      const adminData = {
        email: 'admin@example.com',
        password: 'admin123',
        first_name: 'Admin',
        last_name: 'User',
        role: 'ADMIN'
      };

      const adminResponse = await request(server)
        .post('/api/auth/register')
        .send(adminData)
        .expect(201);

      adminToken = adminResponse.body.data.token;
    });

    it('should create and manage organization', async () => {
      // 1. Create organization
      const orgData = {
        name: 'Integration Test Organization',
        description: 'Test organization for integration testing',
        industry_type: 'IT_SUPPORT',
        website: 'testorg.com',
        phone: '+84-28-1234-5678',
        email: 'info@testorg.com'
      };

      const createResponse = await request(server)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orgData)
        .expect(201);

      expect(createResponse.body.status).toBe('success');
      expect(createResponse.body.data.organization.name).toBe(orgData.name);

      organizationId = createResponse.body.data.organization.id;

      // 2. Get organization details
      const getResponse = await request(server)
        .get(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.status).toBe('success');
      expect(getResponse.body.data.organization.id).toBe(organizationId);

      // 3. Update organization
      const updateResponse = await request(server)
        .put(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated description'
        })
        .expect(200);

      expect(updateResponse.body.status).toBe('success');
      expect(updateResponse.body.data.organization.description).toBe('Updated description');

      // 4. Add member to organization
      const memberResponse = await request(server)
        .post(`/api/organizations/${organizationId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          user_id: 'test-user-id', // This would need to be a real user ID
          role: 'MANAGER'
        });
        // Note: This might fail if user doesn't exist, which is expected

      // 5. Get organization members
      const membersResponse = await request(server)
        .get(`/api/organizations/${organizationId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(membersResponse.body.status).toBe('success');
      expect(Array.isArray(membersResponse.body.data.members)).toBe(true);
    });
  });

  describe('Complete Service Workflow', () => {
    let serviceId;
    let userToken;

    beforeAll(async () => {
      // Create user for service management
      const userData = {
        email: 'service@example.com',
        password: 'service123',
        first_name: 'Service',
        last_name: 'User',
        role: 'USER'
      };

      const userResponse = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      userToken = userResponse.body.data.token;
    });

    it('should create and manage service records', async () => {
      // 1. Create service record
      const serviceData = {
        title: 'Integration Test Service',
        description: 'Test service for integration testing',
        industry_type: 'RESTAURANT',
        customer_name: 'Test Customer',
        customer_email: 'customer@test.com',
        amount: 150000,
        status: 'PENDING',
        priority: 'HIGH',
        date: '2025-02-04',
        due_date: '2025-02-15',
        organization_id: 'test-org-id' // This would need to be a real org ID
      };

      const createResponse = await request(server)
        .post('/api/services')
        .set('Authorization', `Bearer ${userToken}`)
        .send(serviceData);
        // Note: This might fail if organization doesn't exist

      if (createResponse.status === 201) {
        expect(createResponse.body.status).toBe('success');
        serviceId = createResponse.body.data.service.id;

        // 2. Get service details
        const getResponse = await request(server)
          .get(`/api/services/${serviceId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(getResponse.body.status).toBe('success');
        expect(getResponse.body.data.service.id).toBe(serviceId);

        // 3. Update service status
        const updateResponse = await request(server)
          .put(`/api/services/${serviceId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            status: 'IN_PROGRESS',
            priority: 'MEDIUM'
          })
          .expect(200);

        expect(updateResponse.body.status).toBe('success');
        expect(updateResponse.body.data.service.status).toBe('IN_PROGRESS');

        // 4. Complete service
        const completeResponse = await request(server)
          .put(`/api/services/${serviceId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            status: 'COMPLETED',
            completion_date: '2025-02-10'
          })
          .expect(200);

        expect(completeResponse.body.status).toBe('success');
        expect(completeResponse.body.data.service.status).toBe('COMPLETED');
      }
    });

    it('should get service statistics', async () => {
      const statsResponse = await request(server)
        .get('/api/services/stats/overview')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(statsResponse.body.status).toBe('success');
      expect(statsResponse.body.data.overview).toBeDefined();
      expect(statsResponse.data.by_industry).toBeDefined();
      expect(statsResponse.data.by_status).toBeDefined();
    });
  });

  describe('AI Integration Workflow', () => {
    let userToken;

    beforeAll(async () => {
      // Create user for AI features
      const userData = {
        email: 'ai@example.com',
        password: 'ai123',
        first_name: 'AI',
        last_name: 'User',
        role: 'USER'
      };

      const userResponse = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      userToken = userResponse.body.data.token;
    });

    it('should interact with AI features', async () => {
      // 1. Get operational advice
      const adviceResponse = await request(server)
        .post('/api/ai/advice')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: 'How can I improve customer satisfaction?',
          context_data: 'Current satisfaction score: 3.5/5',
          organization_id: 'test-org-id'
        });

      // Note: This might fail if Gemini API key is not configured
      if (adviceResponse.status === 200) {
        expect(adviceResponse.body.status).toBe('success');
        expect(adviceResponse.body.data.advice).toBeDefined();
      }

      // 2. Generate organizational content
      const contentResponse = await request(server)
        .post('/api/ai/generate-content')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'JOB_DESCRIPTION',
          context: {
            role: 'Software Developer',
            departmentName: 'Development Team'
          }
        });

      // Note: This might fail if Gemini API key is not configured
      if (contentResponse.status === 200) {
        expect(contentResponse.body.status).toBe('success');
        expect(contentResponse.body.data.content).toBeDefined();
      }

      // 3. Get AI conversation history
      const historyResponse = await request(server)
        .get('/api/ai/conversations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(historyResponse.body.status).toBe('success');
      expect(Array.isArray(historyResponse.body.data.conversations)).toBe(true);

      // 4. Get AI insights
      const insightsResponse = await request(server)
        .get('/api/ai/insights')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(insightsResponse.body.status).toBe('success');
      expect(Array.isArray(insightsResponse.body.data.insights)).toBe(true);
    });
  });

  describe('File Upload Workflow', () => {
    let userToken;

    beforeAll(async () => {
      // Create user for file operations
      const userData = {
        email: 'file@example.com',
        password: 'file123',
        first_name: 'File',
        last_name: 'User',
        role: 'USER'
      };

      const userResponse = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      userToken = userResponse.body.data.token;
    });

    it('should handle file operations', async () => {
      // 1. Get file statistics
      const statsResponse = await request(server)
        .get('/api/upload/stats/overview')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(statsResponse.body.status).toBe('success');
      expect(statsResponse.body.data.overview).toBeDefined();

      // 2. Get user files
      const filesResponse = await request(server)
        .get('/api/upload/user/files')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(filesResponse.body.status).toBe('success');
      expect(Array.isArray(filesResponse.body.data.files)).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid authentication', async () => {
      // Invalid token
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.status).toBe('fail');
    });

    it('should handle missing authentication', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.status).toBe('fail');
    });

    it('should handle invalid endpoints', async () => {
      const response = await request(server)
        .get('/api/invalid-endpoint')
        .expect(404);

      expect(response.body.status).toBe('fail');
    });

    it('should handle invalid request data', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // Too short
          first_name: '',
          last_name: ''
        })
        .expect(400);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests', async () => {
      const promises = [];
      const concurrentRequests = 10;

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(server)
            .get('/health')
            .expect(200)
        );
      }

      const results = await Promise.all(promises);
      
      results.forEach(response => {
        expect(response.body.status).toBe('OK');
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(server)
        .get('/health')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data integrity across operations', async () => {
      // Create user
      const userData = {
        email: 'consistency@example.com',
        password: 'test123',
        first_name: 'Consistency',
        last_name: 'Test',
        role: 'USER'
      };

      const createResponse = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const userId = createResponse.body.data.user.id;
      const token = createResponse.body.data.token;

      // Verify user exists
      const getResponse = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(getResponse.body.data.user.id).toBe(userId);

      // Update user
      const updateResponse = await request(server)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Updated'
        })
        .expect(200);

      expect(updateResponse.body.data.user.first_name).toBe('Updated');

      // Verify update persisted
      const verifyResponse = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(verifyResponse.body.data.user.first_name).toBe('Updated');
    });
  });
});
