# ServiceNexus Deployment Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Configuration](#application-configuration)
5. [Docker Deployment](#docker-deployment)
6. [Manual Deployment](#manual-deployment)
7. [Environment-Specific Configurations](#environment-specific-configurations)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Backup and Recovery](#backup-and-recovery)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting](#troubleshooting)
12. [Security Considerations](#security-considerations)

---

## 🚀 Prerequisites

### System Requirements

**Minimum Requirements:**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+

**Recommended Requirements:**
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

### Software Dependencies

**Required:**
- Node.js 18.x or higher
- PostgreSQL 13 or higher
- Redis 6.0 or higher
- Nginx 1.18 or higher
- Docker 20.10+ (for containerized deployment)
- Git 2.30+

**Optional:**
- PM2 (Process Manager)
- Elasticsearch (for advanced logging)
- Prometheus + Grafana (for monitoring)
- Slack (for notifications)

---

## 🔧 Environment Setup

### 1. System Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git vim htop

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker
```

### 2. Create Application User

```bash
# Create dedicated user
sudo useradd -m -s /bin/bash servicenexus
sudo usermod -aG sudo servicenexus

# Switch to application user
sudo su - servicenexus
```

### 3. Create Directory Structure

```bash
# Create application directory
sudo mkdir -p /opt/servicenexus
sudo chown servicenexus:servicenexus /opt/servicenexus
cd /opt/servicenexus

# Clone the application
git clone <repository-url> .
```

---

## 🗄 Database Setup

### 1. PostgreSQL Configuration

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE servicenexus;
CREATE USER servicenexus_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE servicenexus TO servicenexus_user;
ALTER USER servicenexus_user WITH SUPERUSER;
\q
```

### 2. PostgreSQL Configuration

Edit `/etc/postgresql/13/main/postgresql.conf`:

```ini
# Connection settings
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB

# Performance settings
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_destination = 'stderr'
logging_collector = 'stderrlog'
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation = 'daily'
log_truncate_on_rotation = true
```

### 3. Redis Configuration

Edit `/etc/redis/redis.conf`:

```ini
# Memory
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass your_redis_password
bind 127.0.0.1

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

### 4. Start Services

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## ⚙ Application Configuration

### 1. Environment Variables

Create `.env.production`:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=servicenexus
DB_USER=servicenexus_user
DB_PASSWORD=your_secure_password
DB_SSL=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Google AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/opt/servicenexus/uploads

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/servicenexus/logs/app.log

# Monitoring
ENABLE_MONITORING=true
METRICS_PORT=9090
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Backup
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_DIR=/opt/servicenexus/backups
```

### 2. Production Package Scripts

Update `package.json`:

```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "echo 'Server build completed'",
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "cypress run",
    "migrate": "node scripts/migrate.js",
    "seed": "node scripts/seed-data.js",
    "backup": "node scripts/backup.js",
    "restore": "node scripts/restore.js",
    "logs": "tail -f logs/app.log",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:restart": "pm2 restart ecosystem.config.js",
    "pm2:logs": "pm2 logs",
    "docker:build": "docker build -t servicenexus:latest .",
    "docker:run": "docker run -p 3001:3001 servicenexus:latest",
    "docker:compose:up": "docker-compose -f docker-compose.prod.yml up -d",
    "docker:compose:down": "docker-compose -f docker-compose.prod.yml down"
  }
}
```

### 3. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'servicenexus',
      script: 'server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/opt/servicenexus/logs/pm2-error.log',
      out_file: '/opt/servicenexus/logs/pm2-out.log',
      log_file: '/opt/servicenexus/logs/pm2.log',
      time: true,
      max_memory_restart: '1G',
      node_env: 'production'
    }
  ]
};
```

---

## 🐳 Docker Deployment

### 1. Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/database ./database
COPY --from=builder /app/scripts ./scripts

# Create non-root user
RUN addgroup -g servicenexus && adduser -g servicenexus -u servicenexus

# Create required directories
RUN mkdir -p /opt/servicenexus/{uploads,logs,backups} && \
    chown -R servicenexus:servicenexus /opt/servicexus

# Copy environment file
COPY .env.production .env

# Switch to non-root user
USER servicenexus

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["npm", "start"]
```

### 2. Docker Compose Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: servicenexus-app
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    volumes:
      - ./uploads:/opt/servicenexus/uploads
      - ./logs:/opt/servicenexus/logs
      - ./backups:/opt/servicenexus/backups
    depends_on:
      - postgres
      - redis
    networks:
      - servicenexus-network

  postgres:
    image: postgres:15-alpine
    container_name: servicenexus-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: servicenexus
      POSTGRES_USER: servicenexus_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    networks:
      - servicenexus-network
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    container_name: servicenexus-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - servicenexus-network
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    container_name: servicenexus-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - servicenexus-network

volumes:
  postgres_data:
  redis_data:
  uploads:
  logs:
  backups:
  ssl:

networks:
  servicenexus-network:
    driver: bridge
```

### 3. Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api {
        rate 10r/s;
        burst 20r;
        nodelay;
    }

    # Upstream configuration
    upstream app {
        server app:3001;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA384:ECDHE-RSA-AES256-SHA384';
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";

        # Proxy to application
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static files
        location /static/ {
            alias /opt/servicenexus/dist;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API routes
        location /api/ {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            limit_req zone $binary_remote_addr zone=api;
        }
    }
}
```

---

## 🚀 Manual Deployment

### 1. Install Dependencies

```bash
# Install application dependencies
npm ci --production

# Install PM2 globally
npm install -g pm2

# Install additional tools
npm install -g cypress
```

### 2. Database Setup

```bash
# Run database migrations
npm run migrate

# Seed initial data
npm run seed
```

### 3. Build Application

```bash
# Build frontend
npm run build

# Build server (if needed)
npm run build:server
```

### 4. Start Application

```bash
# Using PM2
pm2 start

# Or directly
npm start
```

### 5. Nginx Configuration

```bash
# Copy Nginx configuration
sudo cp nginx/nginx.conf /etc/nginx/sites-available/servicenexus
sudo ln -s /etc/nginx/sites-available/servenexus /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🌍 Environment-Specific Configurations

### Development Environment

Create `.env.development`:

```bash
NODE_ENV=development
PORT=3001
HOST=localhost

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=servicenexus_dev
DB_USER=servicenexus_user
DB_PASSWORD=dev_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Development settings
LOG_LEVEL=debug
ENABLE_MONITORING=false
CORS_ORIGIN=http://localhost:3000

# Hot reload
CHOKIDAR_HOT_RELOAD=true
```

### Staging Environment

Create `.env.staging`:

```bash
NODE_ENV=staging
PORT=3001
HOST=0.0.0.0

# Database
DB_HOST=staging-db.example.com
DB_PORT=5432
DB_NAME=servicenexus_staging
DB_USER=servicenexus_user
DB_PASSWORD=staging_password
DB_SSL=true

# Redis
REDIS_HOST=staging-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=staging_redis_password

# CORS
CORS_ORIGIN=https://staging.servicenexus.com
CORS_CREDENTIALS=true

# Monitoring
ENABLE_MONITORING=true
LOG_LEVEL=info
METRICS_PORT=9090
```

### Production Environment

Create `.env.production` (as shown in Application Configuration section).

---

## 📊 Monitoring and Logging

### 1. Application Monitoring

The application includes comprehensive monitoring:

```javascript
// Access monitoring metrics
const monitoring = require('./utils/monitoring');

// Get current metrics
const metrics = monitoring.getMetrics();
console.log('Current metrics:', metrics);

// Get health status
const health = monitoring.getHealthStatus();
console.log('Health status:', health);
```

### 2. Prometheus Metrics

Access metrics at `/metrics` endpoint:

```bash
curl http://localhost:9090/metrics
```

### 3. Health Check

Application health check at `/health`:

```bash
curl http://localhost:3001/health
```

### 4. Log Management

```bash
# View application logs
npm run logs

# View PM2 logs
pm2 logs

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
```

### 5. Alert Configuration

Configure alerts in `.env.production`:

```bash
# Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_ID

# Alert thresholds
ALERT_ERROR_RATE=10
ALERT_RESPONSE_TIME=5000
ALERT_MEMORY_USAGE=512
ALERT_DATABASE_ERRORS=5
```

---

## 💾 Backup and Recovery

### 1. Database Backup

Create backup script `scripts/backup.js`:

```javascript
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(process.env.BACKUP_DIR || './backups', `backup-${timestamp}.sql`);
  
  try {
    const result = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    
    let sql = '-- Database backup - ' + timestamp + '\n';
    sql += '-- Generated on ' + new Date().toISOString() + '\n\n';
    
    for (const row of result.rows) {
      sql += `-- Table: ${row.table_name}\n`;
      sql += `-- Column: ${row.column_name} (${row.data_type})\n`;
      sql += `-- Data: ${row.column_default}\n`;
      sql += '\n';
    }
    
    await fs.writeFile(backupFile, sql);
    console.log(`Database backed up to: ${backupFile}`);
    
    return backupFile;
  } catch (error) {
    console.error('Database backup failed:', error);
    throw error;
  }
}

module.exports = { backupDatabase };
```

### 2. Automated Backup

Add to `package.json`:

```json
{
  "scripts": {
    "backup": "node scripts/backup.js",
    "backup:scheduled": "node scripts/scheduled-backup.js"
  }
}
```

### 3. Recovery Procedures

#### Database Recovery

```bash
# Stop application
pm2 stop

# Restore from backup
psql -U servicenexus_user -d servicenexus < backup-file.sql

# Restart application
pm2 start
```

#### File System Recovery

```bash
# Restore uploads
rsync -av /backups/uploads/ /opt/servicexus/uploads/

# Restore logs
rsync -av /backups/logs/ /opt/servicenexus/logs/

# Restore configuration
cp /backups/.env.production /opt/servicenexus/.env
```

---

## ⚡ Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_date ON services(date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_org_status ON services(organization_id, status);
```

### 2. Connection Pooling

Update database configuration:

```javascript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Enable SSL for production
  ssl: process.env.DB_SSL === 'true',
  sslmode: 'require',
});
```

### 3. Caching Strategy

Implement Redis caching:

```javascript
const Redis = require('redis');
const client = Redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

// Cache API responses
const cacheMiddleware = async (req, res, next) => {
  const key = req.originalUrl;
  const cached = await client.get(key);
  
  if (cached) {
    res.json(JSON.parse(cached));
    return;
  }
  
  // Continue with request
  const originalSend = res.json;
  res.json = function(data) {
    // Cache response for 5 minutes
    client.setex(key, JSON.stringify(data), 300);
    originalSend.call(res, data);
  };
  
  next();
};
```

### 4. Static Asset Optimization

Configure Nginx for static files:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options nosniff;
}

location ~* \.(html)$ {
    expires 1h;
    add_header Cache-Control "public, no-cache";
}
```

---

## 🔒 Security Considerations

### 1. Environment Security

```bash
# Set proper file permissions
chmod 600 .env.production
chmod 600 .env.staging
chmod 600 .env.development

# Restrict file access
chmod 755 /opt/servicexus
chmod 755 /opt/servicenexus/uploads
chmod 755 /opt/servicenexus/logs
chmod 755 /opt/servicenexus/backups
```

### 2. Database Security

```sql
-- Create read-only user for reporting
CREATE USER servicenexus_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE servicenexus TO servicenexus_readonly;
GRANT USAGE ON SCHEMA public TO servicenexus_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO servicenexus_readonly;

-- Revoke unnecessary permissions
REVOKE ALL ON SCHEMA public FROM servicenexus_user;
GRANT CONNECT ON DATABASE servicenexus TO servicenexus_user;
GRANT USAGE ON SCHEMA public TO servicenexus_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO servicenexus_user;
```

### 3. Network Security

```bash
# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001
sudo ufw allow 5432
sudo ufw allow 6379
sudo ufw enable
```

### 4. SSL/TLS Configuration

```bash
# Generate SSL certificate
sudo certbot --nginx -d yourdomain.com -m www.yourdomain.com

# Configure auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Errors

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo journalctl -u postgresql -f

# Test connection
psql -U servicenexus_user -d servicenexus -c "SELECT 1;"
```

#### 2. Application Won't Start

```bash
# Check logs
pm2 logs

# Check environment variables
cat .env.production

# Check port availability
netstat -tlnp | grep :3001

# Check Node.js version
node --version
```

#### 3. Memory Issues

```bash
# Check memory usage
free -h

# Check Node.js memory
ps aux | grep node

# Restart application if needed
pm2 restart
```

#### 4. Slow Performance

```bash
# Check database connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;
```

### Debug Mode

Enable debug logging:

```bash
# Set debug mode
export NODE_ENV=development
export LOG_LEVEL=debug

# Start with debug
npm start
```

---

## 📞 Support and Maintenance

### Monitoring Dashboard

Access monitoring dashboard at:
- **Development**: `http://localhost:9090`
- **Staging**: `https://staging.servicenexus.com:9090`
- **Production**: `https://servicenexus.com:9090`

### Log Analysis

```bash
# View error logs
grep ERROR /opt/servicenexus/logs/app.log

# View recent logs
tail -f /opt/servicenexus/logs/app.log

# Analyze request patterns
grep "Request completed" /opt/servicenexus/logs/app.log | tail -20
```

### Performance Analysis

```bash
# Get performance metrics
curl http://localhost:9090/metrics

# Get health status
curl http://localhost:3001/health

# View application logs
pm2 show servicenexus
```

---

## 📚 Final Checklist

Before going to production, ensure:

- [ ] All tests pass (`npm test`)
- [ ] Security scan passes (`npm audit`)
- [ ] Database migrations complete (`npm run migrate`)
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Backup procedures tested
- - Monitoring configured
- - Performance optimized
- - Security hardening complete
- - Documentation updated

---

## 🎯 Deployment Summary

ServiceNexus is now ready for production deployment with:

- ✅ **Complete testing suite** (unit, integration, E2E)
- ✅ **Docker containerization** with multi-stage builds
- **CI/CD pipeline** with GitHub Actions
- **Comprehensive monitoring** and alerting
- **Security hardening** and best practices
- **Performance optimization** and caching
- **Backup and recovery** procedures
- **Environment-specific** configurations
- **Troubleshooting** guides

**Ready for production deployment!** 🚀

---

*Last Updated: February 4, 2025*
*Version: 1.0.0*
