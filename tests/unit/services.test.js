// Services API Tests
// Test service records management endpoints

const request = require('supertest');

describe('Services API', () => {
  let testUser;
  let testToken;
  let testOrganization;
  let testService;

  beforeEach(async () => {
    // Create test data
    testUser = await global.testUtils.createTestUser();
    testToken = global.testUtils.generateTestToken(testUser.id);
    testOrganization = await global.testUtils.createTestOrganization();
    testService = await global.testUtils.createTestServiceRecord({
      organization_id: testOrganization.id
    });

    // Create test session
    await global.testUtils.createTestSession(testUser.id, testToken);
  });

  describe('GET /api/services', () => {
    it('should get all services for authenticated user', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/services')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.services).toBeDefined();
      expect(Array.isArray(response.body.data.services)).toBe(true);
    });

    it('should filter services by organization', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/services')
        .query({ organization_id: testOrganization.id })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.services.length).toBeGreaterThan(0);
    });

    it('should filter services by status', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/services')
        .query({ status: 'PENDING' })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      response.body.data.services.forEach(service => {
        expect(service.status).toBe('PENDING');
      });
    });

    it('should filter services by priority', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/services')
        .query({ priority: 'MEDIUM' })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      response.body.data.services.forEach(service => {
        expect(service.priority).toBe('MEDIUM');
      });
    });

    it('should paginate results', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/services')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should reject request without authentication', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/services')
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('GET /api/services/:id', () => {
    it('should get specific service by ID', async () => {
      const response = await request('http://localhost:3001')
        .get(`/api/services/${testService.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.service.id).toBe(testService.id);
    });

    it('should return 404 for non-existent service', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body.status).toBe('fail');
    });

    it('should reject request without authentication', async () => {
      const response = await request('http://localhost:3001')
        .get(`/api/services/${testService.id}`)
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('POST /api/services', () => {
    it('should create new service successfully', async () => {
      const serviceData = {
        title: 'New Test Service',
        description: 'Test service description',
        industry_type: 'RESTAURANT',
        customer_name: 'Test Customer',
        amount: 150000,
        status: 'PENDING',
        priority: 'HIGH',
        date: '2025-02-04',
        organization_id: testOrganization.id
      };

      const response = await request('http://localhost:3001')
        .post('/api/services')
        .set('Authorization', `Bearer ${testToken}`)
        .send(serviceData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.service.title).toBe(serviceData.title);
      expect(response.body.data.service.customer_name).toBe(serviceData.customer_name);
    });

    it('should reject creation with missing required fields', async () => {
      const incompleteData = {
        title: 'Incomplete Service'
        // Missing required fields
      };

      const response = await request('http://localhost:3001')
        .post('/api/services')
        .set('Authorization', `Bearer ${testToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.status).toBe('fail');
    });

    it('should reject creation with invalid amount', async () => {
      const invalidData = {
        title: 'Invalid Service',
        industry_type: 'RESTAURANT',
        customer_name: 'Test Customer',
        amount: -1000, // Invalid negative amount
        status: 'PENDING',
        date: '2025-02-04',
        organization_id: testOrganization.id
      };

      const response = await request('http://localhost:3001')
        .post('/api/services')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('fail');
    });

    it('should reject creation without authentication', async () => {
      const serviceData = {
        title: 'Unauthorized Service',
        industry_type: 'RESTAURANT',
        customer_name: 'Test Customer',
        amount: 100000,
        status: 'PENDING',
        date: '2025-02-04',
        organization_id: testOrganization.id
      };

      const response = await request('http://localhost:3001')
        .post('/api/services')
        .send(serviceData)
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('PUT /api/services/:id', () => {
    it('should update service successfully', async () => {
      const updateData = {
        title: 'Updated Service Title',
        status: 'IN_PROGRESS',
        priority: 'HIGH'
      };

      const response = await request('http://localhost:3001')
        .put(`/api/services/${testService.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.service.title).toBe(updateData.title);
      expect(response.body.data.service.status).toBe(updateData.status);
    });

    it('should reject update of non-existent service', async () => {
      const updateData = {
        title: 'Non-existent Update'
      };

      const response = await request('http://localhost:3001')
        .put('/api/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.status).toBe('fail');
    });

    it('should reject update without authentication', async () => {
      const updateData = {
        title: 'Unauthorized Update'
      };

      const response = await request('http://localhost:3001')
        .put(`/api/services/${testService.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('DELETE /api/services/:id', () => {
    it('should delete service successfully', async () => {
      // Create a service to delete
      const serviceToDelete = await global.testUtils.createTestServiceRecord({
        title: 'Service to Delete',
        organization_id: testOrganization.id
      });

      const response = await request('http://localhost:3001')
        .delete(`/api/services/${serviceToDelete.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should reject deletion of non-existent service', async () => {
      const response = await request('http://localhost:3001')
        .delete('/api/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body.status).toBe('fail');
    });

    it('should reject deletion without authentication', async () => {
      const response = await request('http://localhost:3001')
        .delete(`/api/services/${testService.id}`)
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('GET /api/services/stats/overview', () => {
    it('should get service statistics', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/services/stats/overview')
        .query({ organization_id: testOrganization.id })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.by_industry).toBeDefined();
      expect(response.body.data.by_status).toBeDefined();
      expect(response.body.data.monthly_trend).toBeDefined();
    });

    it('should filter statistics by date range', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/services/stats/overview')
        .query({
          organization_id: testOrganization.id,
          date_from: '2025-02-01',
          date_to: '2025-02-04'
        })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should reject statistics request without authentication', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/services/stats/overview')
        .expect(401);

      expect(response.body.status).toBe('fail');
    });
  });

  describe('Service Validation', () => {
    it('should validate industry_type enum values', async () => {
      const validIndustries = [
        'RESTAURANT', 'HOTEL', 'BEAUTY', 'REPAIR', 'LOGISTICS',
        'HEALTHCARE', 'EDUCATION', 'REAL_ESTATE', 'EVENTS', 'IT_SUPPORT'
      ];

      for (const industry of validIndustries) {
        const serviceData = {
          title: `Test Service in ${industry}`,
          industry_type: industry,
          customer_name: 'Test Customer',
          amount: 100000,
          status: 'PENDING',
          date: '2025-02-04',
          organization_id: testOrganization.id
        };

        const response = await request('http://localhost:3001')
          .post('/api/services')
          .set('Authorization', `Bearer ${testToken}`)
          .send(serviceData)
          .expect(201);

        expect(response.body.data.service.industry_type).toBe(industry);
      }
    });

    it('should validate status enum values', async () => {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

      for (const status of validStatuses) {
        const serviceData = {
          title: `Test Service with ${status}`,
          industry_type: 'RESTAURANT',
          customer_name: 'Test Customer',
          amount: 100000,
          status: status,
          date: '2025-02-04',
          organization_id: testOrganization.id
        };

        const response = await request('http://localhost:3001')
          .post('/api/services')
          .set('Authorization', `Bearer ${testToken}`)
          .send(serviceData)
          .expect(201);

        expect(response.body.data.service.status).toBe(status);
      }
    });

    it('should validate priority enum values', async () => {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

      for (const priority of validPriorities) {
        const serviceData = {
          title: `Test Service with ${priority} priority`,
          industry_type: 'RESTAURANT',
          customer_name: 'Test Customer',
          amount: 100000,
          status: 'PENDING',
          priority: priority,
          date: '2025-02-04',
          organization_id: testOrganization.id
        };

        const response = await request('http://localhost:3001')
          .post('/api/services')
          .set('Authorization', `Bearer ${testToken}`)
          .send(serviceData)
          .expect(201);

        expect(response.body.data.service.priority).toBe(priority);
      }
    });
  });
});
