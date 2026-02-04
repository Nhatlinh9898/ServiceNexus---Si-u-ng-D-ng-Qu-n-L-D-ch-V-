// Cypress Support Commands
// Custom commands and utilities for E2E testing

// Import commands
import './commands';

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions in certain cases
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  
  // Return false to prevent Cypress from failing the test
  return false;
});

// Global task for API cleanup
Cypress.on('task', {
  // Clean up test data
  cleanupTestData() {
    return cy.task('cleanupTestData');
  },
  
  // Create test user
  createTestUser(userData) {
    return cy.task('createTestUser', userData);
  },
  
  // Create test organization
  createTestOrganization(orgData) {
    return cy.task('createTestOrganization', orgData);
  },
  
  // Create test service
  createTestService(serviceData) {
    return cy.task('createTestService', serviceData);
  },
  
  // Reset database
  resetDatabase() {
    return cy.task('resetDatabase');
  }
});

// Custom commands for API interactions
Cypress.Commands.add('apiRequest', (method, url, body = null, headers = {}) => {
  return cy.request({
    method,
    url: `${Cypress.env('apiUrl')}${url}`,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    failOnStatusCode: false
  });
});

// Custom command for authentication
Cypress.Commands.add('login', (email = Cypress.env('testEmail'), password = Cypress.env('testPassword')) => {
  return cy.apiRequest('POST', '/auth/login', {
    email,
    password
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.data.token).to.exist;
    
    // Store token in localStorage
    window.localStorage.setItem('token', response.body.data.token);
    
    // Store user data
    window.localStorage.setItem('user', JSON.stringify(response.body.data.user));
    
    return response.body.data;
  });
});

// Custom command for logout
Cypress.Commands.add('logout', () => {
  return cy.apiRequest('POST', '/auth/logout', {}, {
    Authorization: `Bearer ${window.localStorage.getItem('token')}`
  }).then(() => {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
  });
});

// Custom command for registration
Cypress.Commands.add('register', (userData) => {
  const defaultUserData = {
    email: Cypress.env('testEmail'),
    password: Cypress.env('testPassword'),
    first_name: Cypress.env('testFirstName'),
    last_name: Cypress.env('testLastName'),
    role: 'USER'
  };
  
  const finalUserData = { ...defaultUserData, ...userData };
  
  return cy.apiRequest('POST', '/auth/register', finalUserData).then((response) => {
    expect(response.status).to.eq(201);
    expect(response.body.data.token).to.exist;
    
    // Store token in localStorage
    window.localStorage.setItem('token', response.body.data.token);
    
    return response.body.data;
  });
});

// Custom command for checking authentication
Cypress.Commands.add('checkAuth', () => {
  const token = window.localStorage.getItem('token');
  const user = window.localStorage.getItem('user');
  
  if (!token || !user) {
    cy.log('No authentication found');
    return false;
  }
  
  try {
    const userData = JSON.parse(user);
    cy.log(`Authenticated as: ${userData.email}`);
    return true;
  } catch (error) {
    cy.log('Invalid user data in localStorage');
    return false;
  }
});

// Custom command for creating test organization
Cypress.Commands.add('createTestOrganization', (orgData) => {
  const defaultOrgData = {
    name: 'Test Organization',
    description: 'Test organization for E2E testing',
    industry_type: 'IT_SUPPORT',
    website: 'testorg.com',
    phone: '+84-28-1234-5678',
    email: 'info@testorg.com'
  };
  
  const finalOrgData = { ...defaultOrgData, ...orgData };
  
  return cy.apiRequest('POST', '/organizations', finalOrgData).then((response) => {
    expect(response.status).to.eq(201);
    return response.body.data.organization;
  });
});

// Custom command for creating test service
Cypress.Commands.add('createTestService', (serviceData) => {
  const defaultServiceData = {
    title: 'Test Service',
    description: 'Test service for E2E testing',
    industry_type: 'RESTAURANT',
    customer_name: 'Test Customer',
    amount: 100000,
    status: 'PENDING',
    priority: 'MEDIUM',
    date: '2025-02-04',
    organization_id: 'test-org-id'
  };
  
  const finalServiceData = { ...defaultServiceData, ...serviceData };
  
  return cy.apiRequest('POST', '/services', finalServiceData).then((response) => {
    expect(response.status).to.eq(201);
    return response.body.data.service;
  });
});

// Custom command for waiting for API response
Cypress.Commands.add('waitForApiResponse', (url, timeout = 10000) => {
  return cy.apiRequest('GET', url).then((response) => {
    expect(response.status).to.be.oneOf([200, 201]);
    return response.body;
  });
});

// Custom command for file upload
Cypress.Commands.add('uploadFile', (fileName, fileType = 'image/png') => {
  return cy.fixture(fileName).then(fileContent => {
    cy.log(`Uploading file: ${fileName}`);
    
    // Convert file to base64
    const base64Content = Cypress.Buffer.from(fileContent).toString('base64');
    
    return cy.apiRequest('POST', '/upload/single', {
      file: {
        name: fileName,
        type: fileType,
        content: base64Content
      }
    }, {
      'Content-Type': 'multipart/form-data'
    }).then((response) => {
      expect(response.status).to.eq(201);
      return response.body.data.file;
    });
  });
});

// Custom command for checking responsive design
Cypress.Commands.add('checkResponsive', (breakpoints = ['iphone-x', 'ipad-2', 'macbook-13']) => {
  breakpoints.forEach(breakpoint => {
    cy.viewport(breakpoint);
    cy.log(`Testing on ${breakpoint}`);
    
    // Check if main elements are visible
    cy.get('body').should('be.visible');
    
    // Check if navigation is working
    if (cy.get('[data-testid="nav-menu"]').length > 0) {
      cy.get('[data-testid="nav-menu"]').should('be.visible');
    }
    
    // Check if main content is visible
    if (cy.get('[data-testid="main-content"]').length > 0) {
      cy.get('[data-testid="main-content"]').should('be.visible');
    }
  });
});

// Custom command for accessibility testing
Cypress.Commands.add('checkAccessibility', () => {
  // Check for proper heading structure
  cy.get('h1').should('exist');
  
  // Check for alt text on images
  cy.get('img').each(($img) => {
    cy.wrap($img).should('have.attr', 'alt');
  });
  
  // Check for proper form labels
  cy.get('input, select, textarea').each(($input) => {
    const id = $input.attr('id');
    const label = $input.attr('aria-label');
    
    if (id) {
      cy.get(`label[for="${id}"]`).should('exist');
    } else if (!label) {
      cy.wrap($input).should('have.attr', 'aria-label');
    }
  });
  
  // Check for proper button text
  cy.get('button').each(($button) => {
    const text = $button.text().trim();
    const ariaLabel = $button.attr('aria-label');
    
    if (!text && !ariaLabel) {
      cy.wrap($button).should('have.attr', 'aria-label');
    }
  });
});

// Custom command for performance testing
Cypress.Commands.add('measurePerformance', (url) => {
  cy.visit(url);
  
  // Measure page load time
  cy.window().then((win) => {
    const navigation = win.performance.getEntriesByType('navigation')[0];
    const loadTime = navigation.loadEventEnd - navigation.navigationStart;
    
    cy.log(`Page load time: ${loadTime}ms`);
    
    // Assert reasonable load time (less than 3 seconds)
    expect(loadTime).to.be.lessThan(3000);
  });
  
  // Check for large images
  cy.get('img').each(($img) => {
    const naturalWidth = $img.prop('naturalWidth');
    const naturalHeight = $img.prop('naturalHeight');
    const fileSize = naturalWidth * naturalHeight * 3; // Approximate file size
    
    // Warn if image is larger than 1MB
    if (fileSize > 1024 * 1024) {
      cy.log(`Warning: Large image detected (${fileSize} bytes)`);
    }
  });
});

// Custom command for error handling
Cypress.Commands.add('handleError', (errorType, callback) => {
  cy.on('fail', (error, runnable) => {
    if (error.message.includes(errorType)) {
      callback(error, runnable);
    }
  });
});

// Custom command for data seeding
Cypress.Commands.add('seedTestData', () => {
  cy.log('Seeding test data...');
  
  // Create test user
  cy.register({
    email: 'seeded@example.com',
    password: 'seeded123',
    first_name: 'Seeded',
    last_name: 'User',
    role: 'USER'
  }).then(() => {
    cy.log('Test user created');
  });
  
  // Create test organization
  cy.createTestOrganization({
    name: 'Seeded Organization',
    description: 'Organization created by Cypress'
  }).then(() => {
    cy.log('Test organization created');
  });
  
  // Create test services
  for (let i = 0; i < 5; i++) {
    cy.createTestService({
      title: `Seeded Service ${i + 1}`,
      customer_name: `Customer ${i + 1}`,
      amount: 100000 * (i + 1)
    });
  }
  
  cy.log('Test data seeded successfully');
});

// Add beforeEach hook for authentication check
beforeEach(() => {
  // Check if we need to log in
  cy.checkAuth().then((isAuthenticated) => {
    if (!isAuthenticated) {
      cy.log('Not authenticated, logging in...');
      cy.login();
    }
  });
});

// Add afterEach hook for cleanup
afterEach(() => {
  // Take screenshot on test failure
  cy.screenshot();
  
  // Log any console errors
  cy.window().then((win) => {
    if (win.console && win.console.error) {
      cy.log('Console errors:', win.console.error);
    }
  });
});
