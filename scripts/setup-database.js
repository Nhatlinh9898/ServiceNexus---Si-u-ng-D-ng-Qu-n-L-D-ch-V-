#!/usr/bin/env node

// ServiceNexus Database Setup Script
// Run: node scripts/setup-database.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🗄️  ServiceNexus Database Setup\n');

// Database configuration
const dbConfig = {
  name: 'servicenexus',
  user: 'servicenexus_user',
  password: 'servicenexus123',
  host: 'localhost',
  port: 5432
};

// Function to check if PostgreSQL is installed
function checkPostgreSQL() {
  console.log('1️⃣ Checking PostgreSQL installation...');
  
  try {
    const version = execSync('psql --version', { encoding: 'utf8' });
    console.log('✅ PostgreSQL is installed');
    console.log(`📋 Version: ${version.trim()}`);
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL is not installed or not in PATH');
    console.log('\n📝 Installation instructions:');
    console.log('Windows: choco install postgresql');
    console.log('macOS: brew install postgresql');
    console.log('Ubuntu: sudo apt-get install postgresql postgresql-contrib');
    return false;
  }
}

// Function to create database and user
function createDatabaseAndUser() {
  console.log('\n2️⃣ Creating database and user...');
  
  const sqlCommands = [
    `CREATE DATABASE ${dbConfig.name};`,
    `CREATE USER ${dbConfig.user} WITH PASSWORD '${dbConfig.password}';`,
    `GRANT ALL PRIVILEGES ON DATABASE ${dbConfig.name} TO ${dbConfig.user};`,
    `ALTER USER ${dbConfig.user} CREATEDB;`
  ];
  
  try {
    sqlCommands.forEach(command => {
      console.log(`🔧 Executing: ${command}`);
      execSync(`psql -U postgres -c "${command}"`, { stdio: 'inherit' });
    });
    
    console.log('✅ Database and user created successfully');
    return true;
  } catch (error) {
    console.log('❌ Failed to create database/user');
    console.log('Error:', error.message);
    console.log('\n📝 Manual setup required:');
    console.log('1. Connect to PostgreSQL: psql -U postgres');
    console.log('2. Run the SQL commands manually');
    return false;
  }
}

// Function to test database connection
function testDatabaseConnection() {
  console.log('\n3️⃣ Testing database connection...');
  
  const testScript = `
const { Pool } = require('pg');

const pool = new Pool({
  host: '${dbConfig.host}',
  port: ${dbConfig.port},
  database: '${dbConfig.name}',
  user: '${dbConfig.user}',
  password: '${dbConfig.password}',
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Database connection successful');
    console.log('📅 Server time:', res.rows[0].now);
    pool.end();
    process.exit(0);
  }
});
  `;
  
  try {
    // Write test script
    const testFile = path.join(process.cwd(), 'test-db-connection.js');
    fs.writeFileSync(testFile, testScript);
    
    // Run test
    execSync(`node ${testFile}`, { stdio: 'inherit' });
    
    // Clean up
    fs.unlinkSync(testFile);
    
    return true;
  } catch (error) {
    console.log('❌ Database connection test failed');
    return false;
  }
}

// Function to create database configuration
function createDatabaseConfig() {
  console.log('\n4️⃣ Creating database configuration...');
  
  const configDir = path.join(process.cwd(), 'config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }
  
  // Create database configuration file
  const dbConfigContent = `
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '${dbConfig.host}',
  port: process.env.DB_PORT || ${dbConfig.port},
  database: process.env.DB_NAME || '${dbConfig.name}',
  user: process.env.DB_USER || '${dbConfig.user}',
  password: process.env.DB_PASSWORD || '${dbConfig.password}',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

module.exports = pool;
  `;
  
  fs.writeFileSync(
    path.join(configDir, 'database.js'),
    dbConfigContent.trim()
  );
  
  console.log('✅ Database configuration created');
  
  // Create TypeScript version
  const dbConfigTS = `
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || '${dbConfig.host}',
  port: parseInt(process.env.DB_PORT || '${dbConfig.port}'),
  database: process.env.DB_NAME || '${dbConfig.name}',
  user: process.env.DB_USER || '${dbConfig.user}',
  password: process.env.DB_PASSWORD || '${dbConfig.password}',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

export default pool;
  `;
  
  fs.writeFileSync(
    path.join(configDir, 'database.ts'),
    dbConfigTS.trim()
  );
  
  console.log('✅ TypeScript database configuration created');
}

// Function to update environment variables
function updateEnvironmentVariables() {
  console.log('\n5️⃣ Updating environment variables...');
  
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (fs.existsSync(envExamplePath)) {
    let envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Update database variables
    envContent = envContent.replace(
      /DATABASE_URL=.*/,
      `DATABASE_URL=postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.name}`
    );
    
    envContent = envContent.replace(
      /DB_HOST=.*/,
      `DB_HOST=${dbConfig.host}`
    );
    
    envContent = envContent.replace(
      /DB_PORT=.*/,
      `DB_PORT=${dbConfig.port}`
    );
    
    envContent = envContent.replace(
      /DB_NAME=.*/,
      `DB_NAME=${dbConfig.name}`
    );
    
    envContent = envContent.replace(
      /DB_USER=.*/,
      `DB_USER=${dbConfig.user}`
    );
    
    envContent = envContent.replace(
      /DB_PASSWORD=.*/,
      `DB_PASSWORD=${dbConfig.password}`
    );
    
    fs.writeFileSync(envExamplePath, envContent);
    console.log('✅ .env.example updated');
  }
  
  // Create .env.local if it doesn't exist
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envLocalPath)) {
    fs.writeFileSync(envLocalPath, envContent);
    console.log('✅ .env.local created');
  }
}

// Function to create database helper scripts
function createDatabaseHelpers() {
  console.log('\n6️⃣ Creating database helper scripts...');
  
  const scriptsDir = path.join(process.cwd(), 'scripts');
  
  // Database backup script
  const backupScript = `#!/bin/bash
# ServiceNexus Database Backup Script

DB_NAME="${dbConfig.name}"
DB_USER="${dbConfig.user}"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/servicenexus_backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

echo "📦 Creating database backup..."
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "✅ Backup created: $BACKUP_FILE"
  echo "📊 File size: $(du -h $BACKUP_FILE | cut -f1)"
else
  echo "❌ Backup failed"
  exit 1
fi
  `;
  
  fs.writeFileSync(
    path.join(scriptsDir, 'backup-database.sh'),
    backupScript
  );
  
  // Database restore script
  const restoreScript = `#!/bin/bash
# ServiceNexus Database Restore Script

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup_file.sql>"
  echo "Example: $0 backups/servicenexus_backup_20250204_120000.sql"
  exit 1
fi

BACKUP_FILE=$1
DB_NAME="${dbConfig.name}"
DB_USER="${dbConfig.user}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "🔄 Restoring database from backup..."
psql -U $DB_USER -h localhost $DB_NAME < $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "✅ Database restored successfully"
else
  echo "❌ Restore failed"
  exit 1
fi
  `;
  
  fs.writeFileSync(
    path.join(scriptsDir, 'restore-database.sh'),
    restoreScript
  );
  
  console.log('✅ Database helper scripts created');
}

// Main setup function
async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');
  
  // Check PostgreSQL
  if (!checkPostgreSQL()) {
    console.log('\n❌ Please install PostgreSQL first');
    return;
  }
  
  // Create database and user
  if (!createDatabaseAndUser()) {
    console.log('\n❌ Database setup failed');
    return;
  }
  
  // Test connection
  if (!testDatabaseConnection()) {
    console.log('\n❌ Database connection test failed');
    return;
  }
  
  // Create configuration
  createDatabaseConfig();
  
  // Update environment variables
  updateEnvironmentVariables();
  
  // Create helper scripts
  createDatabaseHelpers();
  
  console.log('\n🎉 Database setup completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Test connection: node -e "require(\'./config/database\')"' );
  console.log('2. Run migrations: npm run migrate:up');
  console.log('3. Start development server: npm run dev');
  console.log('\n📊 Database info:');
  console.log(`- Database: ${dbConfig.name}`);
  console.log(`- User: ${dbConfig.user}`);
  console.log(`- Host: ${dbConfig.host}:${dbConfig.port}`);
}

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = {
  setupDatabase,
  dbConfig
};
