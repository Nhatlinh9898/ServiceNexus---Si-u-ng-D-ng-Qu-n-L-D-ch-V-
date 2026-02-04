// Cypress Configuration for ServiceNexus E2E Tests

const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    retries: {
      runMode: 2,
      openMode: 0
    },
    env: {
      apiUrl: 'http://localhost:3001/api',
      // Test credentials
      testEmail: 'cypress@example.com',
      testPassword: 'cypress123',
      testFirstName: 'Cypress',
      testLastName: 'Test'
    }
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      port: 3000
    }
  },
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/reports',
    overwrite: false,
    html: false,
    json: true,
    charts: true,
    reportPageTitle: 'ServiceNexus E2E Test Report'
  },
  setupNodeEvents(on, config) {
    // implement node event listeners here
  },
});
