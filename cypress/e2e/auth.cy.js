// Authentication E2E Tests
// Test user registration, login, logout, and protected routes

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage();
  });

  it('should register a new user successfully', () => {
    cy.visit('/register');
    
    // Check if registration page loads
    cy.url().should('include', '/register');
    cy.get('[data-testid="register-form"]').should('be.visible');
    
    // Fill registration form
    cy.get('[data-testid="email-input"]').type('newuser@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="first-name-input"]').type('New');
    cy.get('[data-testid="last-name-input"]').type('User');
    cy.get('[data-testid="role-select"]').select('USER');
    
    // Submit form
    cy.get('[data-testid="register-button"]').click();
    
    // Should redirect to dashboard or login
    cy.url().should('not.include', '/register');
    
    // Check if user is authenticated
    cy.checkAuth().should('be.true');
    
    // Check for success message
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should show validation errors for invalid registration', () => {
    cy.visit('/register');
    
    // Submit empty form
    cy.get('[data-testid="register-button"]').click();
    
    // Check for validation errors
    cy.get('[data-testid="email-error"]').should('be.visible');
    cy.get('[data-testid="password-error"]').should('be.visible');
    cy.get('[data-testid="name-error"]').should('be.visible');
  });

  it('should show error for duplicate email', () => {
    // Register first user
    cy.register({
      email: 'duplicate@example.com',
      password: 'password123',
      first_name: 'First',
      last_name: 'User'
    });
    
    // Try to register with same email
    cy.visit('/register');
    cy.get('[data-testid="email-input"]').type('duplicate@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="first-name-input"]').type('Second');
    cy.get('[data-testid="last-name-input"]').type('User');
    cy.get('[data-testid="register-button"]').click();
    
    // Should show error message
    cy.get('[data-testid="duplicate-email-error"]').should('be.visible');
  });

  it('should login with valid credentials', () => {
    // Register user first
    cy.register({
      email: 'login@example.com',
      password: 'login123',
      first_name: 'Login',
      last_name: 'User'
    });
    
    // Logout
    cy.logout();
    
    // Visit login page
    cy.visit('/login');
    
    // Check if login page loads
    cy.url().should('include', '/login');
    cy.get('[data-testid="login-form"]').should('be.visible');
    
    // Fill login form
    cy.get('[data-testid="email-input"]').type('login@example.com');
    cy.get('[data-testid="password-input"]').type('login123');
    
    // Submit form
    cy.get('[data-testid="login-button"]').click();
    
    // Should redirect to dashboard
    cy.url().should('not.include', '/login');
    
    // Check if user is authenticated
    cy.checkAuth().should('be.true');
    
    // Check for welcome message
    cy.get('[data-testid="welcome-message"]').should('contain', 'Login');
  });

  it('should show error for invalid login credentials', () => {
    cy.visit('/login');
    
    // Fill with invalid credentials
    cy.get('[data-testid="email-input"]').type('invalid@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();
    
    // Should show error message
    cy.get('[data-testid="login-error"]').should('be.visible');
    cy.url().should('include', '/login');
  });

  it('should logout successfully', () => {
    // Login first
    cy.login();
    
    // Click logout button
    cy.get('[data-testid="logout-button"]').click();
    
    // Should redirect to login page
    cy.url().should('include', '/login');
    
    // Check if user is not authenticated
    cy.checkAuth().should('be.false');
    
    // Check for logout message
    cy.get('[data-testid="logout-message"]').should('be.visible');
  });

  it('should protect routes that require authentication', () => {
    // Try to access protected route without authentication
    cy.visit('/dashboard');
    
    // Should redirect to login
    cy.url().should('include', '/login');
    
    // Check for authentication required message
    cy.get('[data-testid="auth-required-message"]').should('be.visible');
  });

  it('should handle session expiration', () => {
    // Login
    cy.login();
    
    // Clear localStorage to simulate session expiration
    cy.clearLocalStorage();
    
    // Try to access protected route
    cy.visit('/dashboard');
    
    // Should redirect to login
    cy.url().should('include', '/login');
    
    // Check for session expired message
    cy.get('[data-testid="session-expired-message"]').should('be.visible');
  });

  it('should handle password reset flow', () => {
    cy.visit('/forgot-password');
    
    // Check if forgot password page loads
    cy.url().should('include', '/forgot-password');
    cy.get('[data-testid="forgot-password-form"]').should('be.visible');
    
    // Fill email
    cy.get('[data-testid="email-input"]').type('reset@example.com');
    cy.get('[data-testid="reset-button"]').click();
    
    // Should show success message
    cy.get('[data-testid="reset-success-message"]').should('be.visible');
  });

  it('should handle remember me functionality', () => {
    cy.visit('/login');
    
    // Fill login form with remember me
    cy.get('[data-testid="email-input"]').type('remember@example.com');
    cy.get('[data-testid="password-input"]').type('remember123');
    cy.get('[data-testid="remember-me-checkbox"]').check();
    cy.get('[data-testid="login-button"]').click();
    
    // Check if remember me token is stored
    cy.window().then((win) => {
      expect(win.localStorage.getItem('rememberMe')).to.exist();
    });
    
    // Logout and check if email is remembered
    cy.logout();
    cy.visit('/login');
    
    cy.get('[data-testid="email-input"]').should('have.value', 'remember@example.com');
  });

  it('should handle social login options', () => {
    cy.visit('/login');
    
    // Check for social login buttons
    cy.get('[data-testid="google-login-button"]').should('be.visible');
    cy.get('[data-testid="facebook-login-button"]').should('be.visible');
    
    // Click Google login (will redirect to Google OAuth)
    cy.get('[data-testid="google-login-button"]').click();
    
    // Should redirect to Google OAuth
    cy.url().should('include', 'accounts.google.com');
  });

  it('should handle two-factor authentication', () => {
    // Enable 2FA for test user
    cy.login();
    
    // Go to settings
    cy.visit('/settings/security');
    
    // Enable 2FA
    cy.get('[data-testid="enable-2fa-button"]').click();
    
    // Should show 2FA setup modal
    cy.get('[data-testid="2fa-setup-modal"]').should('be.visible');
    
    // Complete 2FA setup
    cy.get('[data-testid="2fa-code-input"]').type('123456');
    cy.get('[data-testid="verify-2fa-button"]').click();
    
    // Should show success message
    cy.get('[data-testid="2fa-enabled-message"]').should('be.visible');
    
    // Logout and test 2FA login
    cy.logout();
    cy.visit('/login');
    
    // Enter credentials
    cy.get('[data-testid="email-input"]').type('2fa@example.com');
    cy.get('[data-testid="password-input"]').type('2fa123');
    cy.get('[data-testid="login-button"]').click();
    
    // Should show 2FA input
    cy.get('[data-testid="2fa-input"]').should('be.visible');
    
    // Enter 2FA code
    cy.get('[data-testid="2fa-input"]').type('123456');
    cy.get('[data-testid="verify-2fa-button"]').click();
    
    // Should login successfully
    cy.url().should('not.include', '/login');
  });

  it('should handle account lockout after failed attempts', () => {
    cy.visit('/login');
    
    // Attempt login with wrong password multiple times
    for (let i = 0; i < 5; i++) {
      cy.get('[data-testid="email-input"]').type('lockout@example.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();
      
      if (i < 4) {
        cy.get('[data-testid="login-error"]').should('be.visible');
      }
    }
    
    // Should show account locked message
    cy.get('[data-testid="account-locked-message"]').should('be.visible');
    
    // Try to login again (should still be locked)
    cy.get('[data-testid="email-input"]').clear().type('lockout@example.com');
    cy.get('[data-testid="password-input"]').clear().type('correctpassword');
    cy.get('[data-testid="login-button"]').click();
    
    cy.get('[data-testid="account-locked-message"]').should('be.visible');
  });

  it('should handle email verification', () => {
    // Register new user
    cy.register({
      email: 'verify@example.com',
      password: 'verify123',
      first_name: 'Verify',
      last_name: 'User'
    });
    
    // Should show email verification required message
    cy.get('[data-testid="email-verification-required"]').should('be.visible');
    
    // Try to access protected features
    cy.visit('/dashboard');
    
    // Should show verification required message
    cy.get('[data-testid="verification-required-message"]').should('be.visible');
    
    // Simulate email verification
    cy.apiRequest('POST', '/auth/verify-email', {
      token: 'verification-token'
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
    
    // Should be able to access features now
    cy.visit('/dashboard');
    cy.url().should('not.include', '/verification');
  });
});
