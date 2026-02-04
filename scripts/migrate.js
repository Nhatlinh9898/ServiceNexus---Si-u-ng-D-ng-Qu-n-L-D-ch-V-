#!/usr/bin/env node

// ServiceNexus Migration System
// Run: node scripts/migrate.js [up|down|status|create]

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'servicenexus',
  user: process.env.DB_USER || 'servicenexus_user',
  password: process.env.DB_PASSWORD || 'servicenexus123',
});

// Migration configuration
const migrationsDir = path.join(process.cwd(), 'database', 'migrations');
const schemaFile = path.join(process.cwd(), 'database', 'schema.sql');

// Ensure migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Migration table setup
async function ensureMigrationTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Migration table ready');
  } catch (error) {
    console.error('❌ Failed to create migration table:', error.message);
    throw error;
  }
}

// Get executed migrations
async function getExecutedMigrations() {
  try {
    const result = await pool.query('SELECT name FROM migrations ORDER BY executed_at');
    return result.rows.map(row => row.name);
  } catch (error) {
    console.error('❌ Failed to get executed migrations:', error.message);
    return [];
  }
}

// Get all migration files
function getMigrationFiles() {
  try {
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    return files;
  } catch (error) {
    console.error('❌ Failed to read migration files:', error.message);
    return [];
  }
}

// Create initial migration from schema
function createInitialMigration() {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const migrationFile = path.join(migrationsDir, `${timestamp}_initial_schema.sql`);
  
  if (fs.existsSync(migrationFile)) {
    console.log('⚠️  Initial migration already exists');
    return;
  }
  
  try {
    // Read schema file
    const schemaContent = fs.readFileSync(schemaFile, 'utf8');
    
    // Write migration file
    fs.writeFileSync(migrationFile, schemaContent);
    console.log(`✅ Created initial migration: ${path.basename(migrationFile)}`);
  } catch (error) {
    console.error('❌ Failed to create initial migration:', error.message);
  }
}

// Run migrations up
async function migrateUp() {
  console.log('🚀 Running migrations up...\n');
  
  try {
    await ensureMigrationTable();
    
    const executed = await getExecutedMigrations();
    const files = getMigrationFiles();
    
    const pending = files.filter(file => !executed.includes(file));
    
    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    
    console.log(`📋 Found ${pending.length} pending migrations:\n`);
    
    for (const file of pending) {
      console.log(`🔄 Running: ${file}`);
      
      try {
        const migrationPath = path.join(migrationsDir, file);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Start transaction
        const client = await pool.connect();
        
        try {
          await client.query('BEGIN');
          
          // Execute migration
          await client.query(migrationSQL);
          
          // Record migration
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          
          await client.query('COMMIT');
          console.log(`✅ Completed: ${file}\n`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        console.error(`❌ Failed to run ${file}:`, error.message);
        throw error;
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration down
async function migrateDown() {
  console.log('🔄 Rolling back last migration...\n');
  
  try {
    const result = await pool.query(
      'SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('⚠️  No migrations to rollback');
      return;
    }
    
    const lastMigration = result.rows[0].name;
    console.log(`🔄 Rolling back: ${lastMigration}`);
    
    // For now, we'll just remove the migration record
    // In a real system, you'd need down migration files
    await pool.query('DELETE FROM migrations WHERE name = $1', [lastMigration]);
    
    console.log(`✅ Rolled back: ${lastMigration}`);
    
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  }
}

// Show migration status
async function migrationStatus() {
  console.log('📊 Migration Status\n');
  
  try {
    await ensureMigrationTable();
    
    const executed = await getExecutedMigrations();
    const files = getMigrationFiles();
    
    console.log(`📋 Total migrations: ${files.length}`);
    console.log(`✅ Executed: ${executed.length}`);
    console.log(`⏳ Pending: ${files.length - executed.length}\n`);
    
    if (files.length > 0) {
      console.log('Migration Details:');
      files.forEach(file => {
        const status = executed.includes(file) ? '✅' : '⏳';
        console.log(`  ${status} ${file}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to get status:', error.message);
  }
}

// Create new migration
function createMigration(name) {
  if (!name) {
    console.error('❌ Migration name required');
    console.log('Usage: node scripts/migrate.js create <migration_name>');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const fileName = `${timestamp}_${name}.sql`;
  const filePath = path.join(migrationsDir, fileName);
  
  const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your SQL here
-- Example:
-- ALTER TABLE users ADD COLUMN new_field VARCHAR(100);

-- Remember to add corresponding down migration
-- Example:
-- ALTER TABLE users DROP COLUMN new_field;
`;
  
  try {
    fs.writeFileSync(filePath, template);
    console.log(`✅ Created migration: ${fileName}`);
    console.log(`📝 Edit file: ${filePath}`);
  } catch (error) {
    console.error('❌ Failed to create migration:', error.message);
  }
}

// Reset database (dangerous!)
async function resetDatabase() {
  console.log('⚠️  WARNING: This will delete all data!');
  console.log('🔄 Resetting database...\n');
  
  try {
    // Drop all tables
    await pool.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
    
    // Run initial migration
    createInitialMigration();
    await migrateUp();
    
    console.log('🎉 Database reset completed!');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    process.exit(1);
  }
}

// Main function
async function main() {
  const command = process.argv[2];
  
  console.log('🗄️  ServiceNexus Migration System\n');
  
  switch (command) {
    case 'up':
      await migrateUp();
      break;
      
    case 'down':
      await migrateDown();
      break;
      
    case 'status':
      await migrationStatus();
      break;
      
    case 'create':
      createMigration(process.argv[3]);
      break;
      
    case 'reset':
      await resetDatabase();
      break;
      
    case 'init':
      createInitialMigration();
      console.log('✅ Initial migration created');
      break;
      
    default:
      console.log('Usage:');
      console.log('  node scripts/migrate.js up          - Run pending migrations');
      console.log('  node scripts/migrate.js down        - Rollback last migration');
      console.log('  node scripts/migrate.js status      - Show migration status');
      console.log('  node scripts/migrate.js create <name> - Create new migration');
      console.log('  node scripts/migrate.js reset       - Reset database (dangerous!)');
      console.log('  node scripts/migrate.js init        - Create initial migration');
      break;
  }
  
  // Close database connection
  await pool.end();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  migrateUp,
  migrateDown,
  migrationStatus,
  createMigration,
  resetDatabase
};
