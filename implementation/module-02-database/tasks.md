# Module 2 Tasks - Database Integration

## Task 2.1: Database Setup

### Steps
1. **Install PostgreSQL**
   ```bash
   # Windows (using Chocolatey)
   choco install postgresql
   
   # macOS (using Homebrew)
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Create database**
   ```sql
   -- Connect to PostgreSQL
   psql -U postgres
   
   -- Create database
   CREATE DATABASE servicenexus;
   
   -- Create user
   CREATE USER servicenexus_user WITH PASSWORD 'your_password';
   
   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE servicenexus TO servicenexus_user;
   ```

3. **Set up connection pooling**
   ```bash
   # Install pg-pool
   npm install pg-pool
   
   # Create connection config
   mkdir config
   touch config/database.js
   ```

4. **Configure environment variables**
   ```env
   # .env.local
   DATABASE_URL=postgresql://servicenexus_user:your_password@localhost:5432/servicenexus
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=servicenexus
   DB_USER=servicenexus_user
   DB_PASSWORD=your_password
   ```

5. **Test connection**
   ```javascript
   // config/database.js
   const { Pool } = require('pg');

   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
   });

   pool.query('SELECT NOW()', (err, res) => {
     if (err) {
       console.error('Database connection error', err);
     } else {
       console.log('Database connected successfully:', res.rows[0]);
     }
   });
   ```

### Expected Output
- PostgreSQL installed and running
- Database created
- User created with privileges
- Connection test successful

---

## Task 2.2: Schema Design

### Steps
1. **Create users table**
   ```sql
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     first_name VARCHAR(100) NOT NULL,
     last_name VARCHAR(100) NOT NULL,
     role VARCHAR(50) DEFAULT 'user',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Create organizations table**
   ```sql
   CREATE TABLE organizations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(255) NOT NULL,
     description TEXT,
     industry_type VARCHAR(100) NOT NULL,
     created_by UUID REFERENCES users(id),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **Create departments table**
   ```sql
   CREATE TABLE departments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(255) NOT NULL,
     type VARCHAR(50) NOT NULL,
     organization_id UUID REFERENCES organizations(id),
     parent_department_id UUID REFERENCES departments(id),
     manager_id UUID REFERENCES users(id),
     description TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

4. **Create service_records table**
   ```sql
   CREATE TABLE service_records (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title VARCHAR(255) NOT NULL,
     industry_type VARCHAR(100) NOT NULL,
     customer_name VARCHAR(255) NOT NULL,
     amount DECIMAL(12,2) NOT NULL,
     status VARCHAR(50) NOT NULL,
     date DATE NOT NULL,
     notes TEXT,
     priority VARCHAR(20) DEFAULT 'Medium',
     organization_id UUID REFERENCES organizations(id),
     created_by UUID REFERENCES users(id),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

5. **Create employees table**
   ```sql
   CREATE TABLE employees (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(255) NOT NULL,
     email VARCHAR(255) UNIQUE NOT NULL,
     phone VARCHAR(20),
     role VARCHAR(100) NOT NULL,
     level VARCHAR(50) NOT NULL,
     department_id UUID REFERENCES departments(id),
     organization_id UUID REFERENCES organizations(id),
     status VARCHAR(50) DEFAULT 'Active',
     job_description TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

6. **Create indexes**
   ```sql
   -- Users indexes
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_users_role ON users(role);
   
   -- Service records indexes
   CREATE INDEX idx_service_records_org ON service_records(organization_id);
   CREATE INDEX idx_service_records_status ON service_records(status);
   CREATE INDEX idx_service_records_date ON service_records(date);
   
   -- Departments indexes
   CREATE INDEX idx_departments_org ON departments(organization_id);
   CREATE INDEX idx_departments_parent ON departments(parent_department_id);
   ```

### Expected Output
- All tables created
- Relationships established
- Indexes created
- Schema documented

---

## Task 2.3: Migration Scripts

### Steps
1. **Install migration tool**
   ```bash
   npm install --save-dev db-migrate
   npm install --save-dev db-migrate-pg
   ```

2. **Create migration configuration**
   ```json
   // database.json
   {
     "dev": {
       "driver": "pg",
       "host": "localhost",
       "port": 5432,
       "database": "servicenexus",
       "user": "servicenexus_user",
       "password": "your_password"
     }
   }
   ```

3. **Create initial migration**
   ```bash
   npx db-migrate create initial_schema --sql-file
   ```

4. **Write migration SQL**
   ```sql
   -- migrations/sqls/20250204000001-initial-schema-up.sql
   -- Copy all CREATE TABLE statements from Task 2.2
   
   -- migrations/sqls/20250204000001-initial-schema-down.sql
   DROP TABLE IF EXISTS employees;
   DROP TABLE IF EXISTS service_records;
   DROP TABLE IF EXISTS departments;
   DROP TABLE IF EXISTS organizations;
   DROP TABLE IF EXISTS users;
   ```

5. **Create migration runner script**
   ```javascript
   // scripts/migrate.js
   const dbmigrate = require('db-migrate');

   const migrate = dbmigrate.getInstance(true);

   migrate.up().then(() => {
     console.log('Migration completed successfully');
     process.exit(0);
   }).catch((err) => {
     console.error('Migration failed:', err);
     process.exit(1);
   });
   ```

6. **Test migration**
   ```bash
   # Run migration
   npm run migrate:up
   
   # Check status
   npx db-migrate status
   
   # Test rollback
   npm run migrate:down
   npm run migrate:up
   ```

7. **Add migration scripts to package.json**
   ```json
   "scripts": {
     "migrate:up": "node scripts/migrate.js",
     "migrate:down": "npx db-migrate down",
     "migrate:create": "npx db-migrate create",
     "migrate:status": "npx db-migrate status"
   }
   ```

### Expected Output
- Migration tool installed
- Initial migration created
- Migration scripts working
- Rollback procedures tested

---

## 🧪 Testing

### Verification Commands
```bash
# Test database connection
node -e "require('./config/database').query('SELECT NOW()')"

# Test migration
npm run migrate:status

# Test schema
psql -d servicenexus -c "\dt"

# Test indexes
psql -d servicenexus -c "\di"
```

### Expected Results
- Database connection successful
- Migration status shows completed
- All tables listed
- Indexes created successfully

---

## ✅ Completion Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created
- [ ] User created with privileges
- [ ] Connection pool configured
- [ ] Environment variables set
- [ ] Connection test passing
- [ ] Users table created
- [ ] Organizations table created
- [ ] Departments table created
- [ ] Service records table created
- [ ] Employees table created
- [ ] All indexes created
- [ ] Migration tool installed
- [ ] Initial migration created
- [ ] Migration scripts working
- [ ] Rollback procedures tested
- [ ] All verification commands pass

---

## 🚀 Next Steps

Sau khi hoàn thành Module 2:
1. Chuyển sang Module 3: API Development
2. Bắt đầu với `module-03-api/foundation.md`
3. Kiểm tra prerequisites cho Module 3
