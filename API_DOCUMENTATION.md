# ServiceNexus API Documentation

## 📋 Overview

ServiceNexus RESTful API provides comprehensive endpoints for managing multi-tenant service operations across 51+ industries with AI-powered insights.

**Base URL**: `http://localhost:3001/api`
**API Version**: `1.0.0`
**Authentication**: JWT Bearer Token

---

## 🔐 Authentication

### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "USER"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "USER"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Refresh Token
```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

### Logout
```http
POST /api/auth/logout
```

---

## 👥 Users Management

### Get All Users
```http
GET /api/users?page=1&limit=10&search=john&role=USER
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search in name, email
- `role` (string): Filter by role

**Response:**
```json
{
  "status": "success",
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

### Get User by ID
```http
GET /api/users/:id
```

### Update User
```http
PUT /api/users/:id
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "role": "MANAGER",
  "is_active": true
}
```

### Change Password
```http
POST /api/users/:id/change-password
```

**Request Body:**
```json
{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

---

## 🏢 Organizations Management

### Get All Organizations
```http
GET /api/organizations?page=1&limit=10&search=tech&industry_type=IT_SUPPORT
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `search`: Search in name, description
- `industry_type`: Filter by industry

### Get Organization Details
```http
GET /api/organizations/:id
```

**Response includes:**
- Organization details
- Departments
- Employees
- Recent services
- Statistics

### Create Organization
```http
POST /api/organizations
```

**Request Body:**
```json
{
  "name": "Tech Solutions Ltd",
  "description": "IT services company",
  "industry_type": "IT_SUPPORT",
  "website": "techsolutions.com",
  "phone": "+84-28-1234-5678",
  "email": "info@techsolutions.com",
  "address": "123 Tech Street, Ho Chi Minh City"
}
```

### Update Organization
```http
PUT /api/organizations/:id
```

### Get Organization Members
```http
GET /api/organizations/:id/members
```

### Add Organization Member
```http
POST /api/organizations/:id/members
```

**Request Body:**
```json
{
  "user_id": "uuid",
  "role": "MANAGER"
}
```

---

## 🏛️ Departments Management

### Get All Departments
```http
GET /api/departments?organization_id=uuid&page=1&limit=10
```

### Get Department Details
```http
GET /api/departments/:id
```

### Create Department
```http
POST /api/departments
```

**Request Body:**
```json
{
  "name": "Development Team",
  "type": "OFFICE",
  "organization_id": "uuid",
  "parent_department_id": "uuid",
  "manager_id": "uuid",
  "description": "Software development team",
  "budget": 50000000
}
```

### Get Department Hierarchy
```http
GET /api/departments/hierarchy/tree?organization_id=uuid
```

---

## 👥 Employees Management

### Get All Employees
```http
GET /api/employees?organization_id=uuid&department_id=uuid&status=Active
```

### Get Employee Details
```http
GET /api/employees/:id
```

### Create Employee
```http
POST /api/employees
```

**Request Body:**
```json
{
  "name": "John Developer",
  "email": "john@company.com",
  "phone": "+84-901-234-567",
  "role": "Senior Developer",
  "level": "SPECIALIST",
  "department_id": "uuid",
  "organization_id": "uuid",
  "status": "Active",
  "hire_date": "2025-01-15",
  "salary": 35000000,
  "skills": ["JavaScript", "React", "Node.js"]
}
```

### Get Employee Statistics
```http
GET /api/employees/stats/overview?organization_id=uuid
```

---

## 📋 Service Records Management

### Get All Services
```http
GET /api/services?page=1&limit=10&status=COMPLETED&priority=HIGH
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `search`: Search in title, customer, notes
- `status`: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
- `priority`: LOW, MEDIUM, HIGH, URGENT
- `industry_type`: Filter by industry
- `organization_id`: Filter by organization
- `assigned_to`: Filter by assigned employee
- `date_from`, `date_to`: Date range filter

### Get Service Details
```http
GET /api/services/:id
```

**Response includes:**
- Service details
- Change history

### Create Service Record
```http
POST /api/services
```

**Request Body:**
```json
{
  "title": "Website Development Project",
  "description": "E-commerce website development",
  "industry_type": "IT_SUPPORT",
  "customer_name": "Retail Store Chain",
  "customer_email": "it@retailstore.com",
  "amount": 200000000,
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "date": "2025-01-20",
  "due_date": "2025-03-31",
  "organization_id": "uuid",
  "assigned_to": "uuid",
  "notes": "Payment gateway integration required"
}
```

### Update Service Record
```http
PUT /api/services/:id
```

### Delete Service Record
```http
DELETE /api/services/:id
```

### Get Service Statistics
```http
GET /api/services/stats/overview?organization_id=uuid&date_from=2025-01-01
```

**Response includes:**
- Overall statistics
- By industry type
- By status
- Monthly trends

---

## 🤖 AI Features

### Get Operational Advice
```http
POST /api/ai/advice
```

**Request Body:**
```json
{
  "query": "How can I improve customer satisfaction in my restaurant?",
  "context_data": "Current customer satisfaction score: 3.5/5",
  "organization_id": "uuid"
}
```

### Analyze Service Data
```http
POST /api/ai/analyze-services
```

**Request Body:**
```json
{
  "organization_id": "uuid",
  "date_from": "2025-01-01",
  "date_to": "2025-01-31"
}
```

### Generate Organizational Content
```http
POST /api/ai/generate-content
```

**Request Body:**
```json
{
  "type": "JOB_DESCRIPTION",
  "context": {
    "role": "Senior Developer",
    "departmentName": "Development Team"
  }
}
```

**Content Types:**
- `JOB_DESCRIPTION`: Generate job descriptions
- `SAFETY_REGULATIONS`: Generate safety rules
- `DEPT_FUNCTIONS`: Generate department functions

### Get AI Conversation History
```http
GET /api/ai/conversations?organization_id=uuid&page=1&limit=20
```

### Get AI Insights
```http
GET /api/ai/insights?organization_id=uuid&insight_type=performance
```

### Mark Insight as Actioned
```http
PATCH /api/ai/insights/:id/action
```

---

## 🏥 Health Check

### Health Status
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-02-04T12:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0"
}
```

---

## 📚 API Information

### Get API Info
```http
GET /api
```

**Response:**
```json
{
  "message": "ServiceNexus API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "users": "/api/users",
    "organizations": "/api/organizations",
    "departments": "/api/departments",
    "employees": "/api/employees",
    "services": "/api/services",
    "ai": "/api/ai"
  },
  "documentation": "/api/docs",
  "health": "/health"
}
```

---

## 🔧 Error Handling

### Standard Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "error": "Detailed error info (development only)"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

### Validation Errors
```json
{
  "status": "fail",
  "message": "Invalid input data: field is required"
}
```

---

## 🚀 Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

## 📝 Data Types

### Industry Types
```javascript
RESTAURANT, HOTEL, BEAUTY, REPAIR, LOGISTICS,
HEALTHCARE, EDUCATION, REAL_ESTATE, EVENTS, IT_SUPPORT,
LEGAL, FINANCE, AGRICULTURE, CONSTRUCTION, MARKETING,
// ... 51 total industries
```

### User Roles
```javascript
SUPER_ADMIN, ADMIN, MANAGER, LEADER, SPECIALIST, USER
```

### Employee Levels
```javascript
C_LEVEL, DIRECTOR, MANAGER, LEADER, SPECIALIST, WORKER, INTERN
```

### Service Status
```javascript
PENDING, IN_PROGRESS, COMPLETED, CANCELLED
```

### Priority Levels
```javascript
LOW, MEDIUM, HIGH, URGENT
```

---

## 🔍 Pagination

All list endpoints support pagination with:
- `page` (default: 1)
- `limit` (default: 10, max: 100)

**Response includes pagination metadata:**
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

## 🛡️ Security Features

- JWT Authentication
- Rate Limiting
- Input Validation
- SQL Injection Protection
- XSS Protection
- CORS Configuration
- Security Headers (Helmet.js)

---

## 📊 Monitoring & Logging

- Request logging (Morgan)
- Error logging
- Performance monitoring
- Database query logging
- AI conversation tracking

---

## 🔄 Version History

### v1.0.0 (2025-02-04)
- Initial API release
- Authentication system
- Multi-tenant organizations
- Service management
- AI integration
- Employee management
- Department hierarchy

---

## 📞 Support

- **Documentation**: `/api/docs`
- **Health Check**: `/health`
- **API Info**: `/api`
- **Error Reporting**: Check server logs

---

*Last Updated: February 4, 2025*
*API Version: 1.0.0*
