-- ServiceNexus Database Schema
-- Version: 1.0
-- Created: February 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================

-- User roles
CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'LEADER',
    'SPECIALIST',
    'USER'
);

-- Employee levels
CREATE TYPE employee_level AS ENUM (
    'C_LEVEL',
    'DIRECTOR',
    'MANAGER',
    'LEADER',
    'SPECIALIST',
    'WORKER',
    'INTERN'
);

-- Department types
CREATE TYPE department_type AS ENUM (
    'OFFICE',
    'FACTORY',
    'SITE'
);

-- Service record status
CREATE TYPE service_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);

-- Priority levels
CREATE TYPE priority_level AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);

-- Industry types (matching TypeScript enum)
CREATE TYPE industry_type AS ENUM (
    'RESTAURANT', 'HOTEL', 'BEAUTY', 'REPAIR', 'LOGISTICS',
    'HEALTHCARE', 'EDUCATION', 'REAL_ESTATE', 'EVENTS', 'IT_SUPPORT',
    'LEGAL', 'FINANCE', 'AGRICULTURE', 'CONSTRUCTION', 'MARKETING',
    'MANUFACTURING', 'TOURISM', 'SECURITY', 'FITNESS', 'PET_CARE',
    'RETAIL', 'INSURANCE', 'RECRUITMENT', 'CLEANING', 'FASHION',
    'AUTOMOTIVE', 'ENTERTAINMENT', 'PRINTING', 'CONSULTING', 'ENERGY',
    'TELECOM', 'DESIGN', 'TRANSLATION', 'WAREHOUSING', 'ENVIRONMENT',
    'MINING', 'FISHERY', 'FORESTRY', 'CRAFTS', 'RESEARCH',
    'AVIATION', 'IMPORT_EXPORT', 'MEDIA', 'NON_PROFIT', 'RENTAL',
    'BIOTECH', 'ROBOTICS', 'SPACE', 'URBAN_PLANNING', 'MUSEUM'
);

-- =============================================
-- CORE TABLES
-- =============================================

-- Users table (authentication and authorization)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'USER',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table (multi-tenant support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry_type industry_type NOT NULL,
    logo_url VARCHAR(500),
    website VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    subscription_plan VARCHAR(50) DEFAULT 'FREE',
    max_users INTEGER DEFAULT 10,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization members (many-to-many relationship)
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'USER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(organization_id, user_id)
);

-- Departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type department_type NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES users(id),
    description TEXT,
    budget DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work sites (factories, construction sites, etc.)
CREATE TABLE work_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'CONSTRUCTION_SITE', 'FACTORY_PLANT', etc.
    location TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    director_id UUID REFERENCES users(id),
    safety_regulations TEXT,
    operating_hours TEXT,
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(100) NOT NULL,
    level employee_level NOT NULL,
    department_id UUID REFERENCES departments(id),
    work_site_id UUID REFERENCES work_sites(id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- If employee has system access
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'OnLeave', 'Resigned'
    hire_date DATE,
    salary DECIMAL(12,2),
    job_description TEXT,
    skills TEXT[], -- Array of skills
    avatar_url VARCHAR(500),
    emergency_contact TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SERVICE MANAGEMENT
-- =============================================

-- Service records (core business entity)
CREATE TABLE service_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    industry_type industry_type NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'VND',
    status service_status DEFAULT 'PENDING',
    priority priority_level DEFAULT 'MEDIUM',
    date DATE NOT NULL,
    due_date DATE,
    completion_date DATE,
    notes TEXT,
    tags TEXT[],
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES employees(id),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service record history (audit trail)
CREATE TABLE service_record_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_record_id UUID NOT NULL REFERENCES service_records(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- AI & ANALYTICS
-- =============================================

-- AI conversations
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    session_id VARCHAR(255) NOT NULL,
    message_type VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI insights and recommendations
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    insight_type VARCHAR(100) NOT NULL, -- 'performance', 'trend', 'recommendation'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    data_source TEXT,
    is_actioned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- =============================================
-- SYSTEM & LOGGING
-- =============================================

-- System logs
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL, -- 'error', 'warn', 'info', 'debug'
    message TEXT NOT NULL,
    context JSONB,
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Organizations indexes
CREATE INDEX idx_organizations_industry ON organizations(industry_type);
CREATE INDEX idx_organizations_active ON organizations(is_active);
CREATE INDEX idx_organizations_created_by ON organizations(created_by);

-- Departments indexes
CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);
CREATE INDEX idx_departments_manager ON departments(manager_id);

-- Employees indexes
CREATE INDEX idx_employees_org ON employees(organization_id);
CREATE INDEX idx_employees_dept ON employees(department_id);
CREATE INDEX idx_employees_site ON employees(work_site_id);
CREATE INDEX idx_employees_email ON employees(email);

-- Service records indexes
CREATE INDEX idx_service_records_org ON service_records(organization_id);
CREATE INDEX idx_service_records_status ON service_records(status);
CREATE INDEX idx_service_records_priority ON service_records(priority);
CREATE INDEX idx_service_records_date ON service_records(date);
CREATE INDEX idx_service_records_assigned ON service_records(assigned_to);
CREATE INDEX idx_service_records_industry ON service_records(industry_type);

-- AI conversations indexes
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_session ON ai_conversations(session_id);
CREATE INDEX idx_ai_conversations_org ON ai_conversations(organization_id);

-- System logs indexes
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created ON system_logs(created_at);
CREATE INDEX idx_system_logs_user ON system_logs(user_id);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_sites_updated_at BEFORE UPDATE ON work_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_records_updated_at BEFORE UPDATE ON service_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Service record history trigger
CREATE OR REPLACE FUNCTION log_service_record_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log changes to tracked fields
        IF OLD.title IS DISTINCT FROM NEW.title THEN
            INSERT INTO service_record_history (service_record_id, field_name, old_value, new_value, changed_by)
            VALUES (NEW.id, 'title', OLD.title, NEW.title, NEW.updated_by);
        END IF;
        
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO service_record_history (service_record_id, field_name, old_value, new_value, changed_by)
            VALUES (NEW.id, 'status', OLD.status, NEW.status, NEW.updated_by);
        END IF;
        
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO service_record_history (service_record_id, field_name, old_value, new_value, changed_by)
            VALUES (NEW.id, 'assigned_to', OLD.assigned_to::text, NEW.assigned_to::text, NEW.updated_by);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER service_record_history_trigger BEFORE UPDATE ON service_records FOR EACH ROW EXECUTE FUNCTION log_service_record_changes();

-- =============================================
-- VIEWS
-- =============================================

-- Active employees with details
CREATE VIEW active_employees AS
SELECT 
    e.*,
    d.name as department_name,
    ws.name as work_site_name,
    o.name as organization_name,
    u.email as user_email
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN work_sites ws ON e.work_site_id = ws.id
JOIN organizations o ON e.organization_id = o.id
LEFT JOIN users u ON e.user_id = u.id
WHERE e.status = 'Active' AND e.organization_id IS NOT NULL;

-- Service records with full details
CREATE VIEW service_records_details AS
SELECT 
    sr.*,
    o.name as organization_name,
    e.name as assigned_employee_name,
    u.email as created_by_email,
    u2.email as updated_by_email
FROM service_records sr
JOIN organizations o ON sr.organization_id = o.id
LEFT JOIN employees e ON sr.assigned_to = e.id
JOIN users u ON sr.created_by = u.id
LEFT JOIN users u2 ON sr.updated_by = u2.id;

-- Organization statistics
CREATE VIEW organization_stats AS
SELECT 
    o.id,
    o.name,
    COUNT(DISTINCT e.id) as employee_count,
    COUNT(DISTINCT d.id) as department_count,
    COUNT(DISTINCT ws.id) as work_site_count,
    COUNT(DISTINCT sr.id) as service_record_count,
    COUNT(DISTINCT CASE WHEN sr.status = 'COMPLETED' THEN sr.id END) as completed_services,
    SUM(CASE WHEN sr.status = 'COMPLETED' THEN sr.amount ELSE 0 END) as total_revenue
FROM organizations o
LEFT JOIN employees e ON o.id = e.organization_id AND e.status = 'Active'
LEFT JOIN departments d ON o.id = d.organization_id AND d.is_active = true
LEFT JOIN work_sites ws ON o.id = ws.organization_id AND ws.is_active = true
LEFT JOIN service_records sr ON o.id = sr.organization_id
GROUP BY o.id, o.name;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Create default super admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
VALUES (
    'admin@servicenexus.com',
    '$2b$10$rQZ8ZqZqZqZqZqZqZqZqZu', -- bcrypt hash for 'admin123'
    'System',
    'Administrator',
    'SUPER_ADMIN',
    true,
    true
);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE users IS 'System users with authentication and authorization';
COMMENT ON TABLE organizations IS 'Multi-tenant organizations';
COMMENT ON TABLE departments IS 'Organizational departments';
COMMENT ON TABLE employees IS 'Employee records and details';
COMMENT ON TABLE service_records IS 'Core business service records';
COMMENT ON TABLE ai_conversations IS 'AI chat history and sessions';
COMMENT ON TABLE system_logs IS 'System audit logs';

-- Schema version
INSERT INTO system_logs (level, message, context)
VALUES ('info', 'Database schema initialized', '{"version": "1.0", "created": "2025-02-04"}');
