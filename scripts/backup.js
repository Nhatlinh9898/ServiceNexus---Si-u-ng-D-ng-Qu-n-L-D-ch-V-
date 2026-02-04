#!/usr/bin/env node

// ServiceNexus Backup Script
// Automated database and file backup system

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class BackupSystem {
  constructor() {
    this.config = {
      dbHost: process.env.DB_HOST || 'localhost',
      dbPort: process.env.DB_PORT || 5432,
      dbName: process.env.DB_NAME || 'servicenexus',
      dbUser: process.env.DB_USER || 'servicenexus_user',
      dbPassword: process.env.DB_PASSWORD || 'servicenexus123',
      backupDir: process.env.BACKUP_DIR || './backups',
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
      compression: process.env.BACKUP_COMPRESSION === 'true',
      uploadToCloud: process.env.UPLOAD_TO_CLOUD === 'true',
      cloudProvider: process.env.CLOUD_PROVIDER || 's3',
      cloudBucket: process.env.CLOUD_BUCKET || 'servicenexus-backups'
    };
    
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupFileName = `backup-${this.timestamp}`;
    this.backupPath = path.join(this.config.backupDir, this.backupFileName);
  }

  async runBackup() {
    try {
      console.log('🔄 Starting ServiceNexus backup...');
      
      // Create backup directory
      await this.ensureBackupDirectory();
      
      // Create backup metadata
      const metadata = await this.createMetadata();
      
      // Database backup
      console.log('📊 Creating database backup...');
      const dbBackupPath = await this.backupDatabase();
      
      // Files backup
      console.log('📁 Creating files backup...');
      const filesBackupPath = await this.backupFiles();
      
      // Configuration backup
      console.log('⚙️ Creating configuration backup...');
      const configBackupPath = await this.backupConfiguration();
      
      // Create combined backup
      console.log('📦 Creating combined backup...');
      const combinedBackupPath = await this.createCombinedBackup(metadata, dbBackupPath, filesBackupPath, configBackupPath);
      
      // Compress backup if enabled
      if (this.config.compression) {
        console.log('🗜️ Compressing backup...');
        const compressedPath = await this.compressBackup(combinedBackupPath);
        
        // Upload to cloud if enabled
        if (this.config.uploadToCloud) {
          console.log('☁️ Uploading to cloud...');
          await this.uploadToCloud(compressedPath);
        }
        
        // Clean up old backups
        await this.cleanupOldBackups();
        
        console.log('✅ Backup completed successfully!');
        console.log(`📍 Backup location: ${compressedPath}`);
      } else {
        console.log('✅ Backup completed successfully!');
        console.log(`📍 Backup location: ${combinedBackupPath}`);
      }
      
      return {
        success: true,
        path: this.config.compression ? compressedPath : combinedBackupPath,
        timestamp: this.timestamp,
        metadata
      };
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.config.backupDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create backup directory: ${error.message}`);
    }
  }

  async createMetadata() {
    const metadata = {
      timestamp: this.timestamp,
      version: require('../package.json').version,
      environment: process.env.NODE_ENV,
      database: {
        host: this.config.dbHost,
        port: this.config.dbPort,
        name: this.config.dbName,
        user: this.config.dbUser
      },
      backup: {
        type: 'full',
        compression: this.config.compression,
        uploadToCloud: this.config.uploadToCloud
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    await fs.writeFile(
      path.join(this.backupPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    return metadata;
  }

  async backupDatabase() {
    const dbBackupPath = path.join(this.backupPath, 'database');
    await fs.mkdir(dbBackupPath, { recursive: true });
    
    // Create database dump
    const dumpFile = path.join(dbBackupPath, 'database.sql');
    const pgDumpCommand = `PGPASSWORD="${this.config.dbPassword}" pg_dump -h ${this.config.dbHost} -p ${this.config.dbPort} -U ${this.config.dbUser} -d ${this.config.dbName} --no-password --verbose --format=custom --file="${dumpFile}"`;
    
    try {
      await execAsync(pgDumpCommand);
      console.log('✅ Database dump created');
    } catch (error) {
      throw new Error(`Database backup failed: ${error.message}`);
    }
    
    // Create schema-only backup
    const schemaFile = path.join(dbBackupPath, 'schema.sql');
    const schemaCommand = `PGPASSWORD="${this.config.dbPassword}" pg_dump -h ${this.config.dbHost} -p ${this.config.dbPort} -U ${this.config.dbUser} -d ${this.config.dbName} --no-password --schema-only --file="${schemaFile}"`;
    
    try {
      await execAsync(schemaCommand);
      console.log('✅ Schema backup created');
    } catch (error) {
      console.warn('⚠️ Schema backup failed:', error.message);
    }
    
    // Create data-only backup
    const dataFile = path.join(dbBackupPath, 'data.sql');
    const dataCommand = `PGPASSWORD="${this.config.dbPassword}" pg_dump -h ${this.config.dbHost} -p ${this.config.dbPort} -U ${this.config.dbUser} -d ${this.config.dbName} --no-password --data-only --file="${dataFile}"`;
    
    try {
      await execAsync(dataCommand);
      console.log('✅ Data backup created');
    } catch (error) {
      console.warn('⚠️ Data backup failed:', error.message);
    }
    
    return dbBackupPath;
  }

  async backupFiles() {
    const filesBackupPath = path.join(this.backupPath, 'files');
    await fs.mkdir(filesBackupPath, { recursive: true });
    
    // Backup uploads directory
    const uploadsSource = process.env.UPLOAD_DIR || './uploads';
    const uploadsTarget = path.join(filesBackupPath, 'uploads');
    
    try {
      await this.copyDirectory(uploadsSource, uploadsTarget);
      console.log('✅ Uploads backup created');
    } catch (error) {
      console.warn('⚠️ Uploads backup failed:', error.message);
    }
    
    // Backup logs directory
    const logsSource = process.env.LOG_FILE ? path.dirname(process.env.LOG_FILE) : './logs';
    const logsTarget = path.join(filesBackupPath, 'logs');
    
    try {
      await this.copyDirectory(logsSource, logsTarget);
      console.log('✅ Logs backup created');
    } catch (error) {
      console.warn('⚠️ Logs backup failed:', error.message);
    }
    
    return filesBackupPath;
  }

  async backupConfiguration() {
    const configBackupPath = path.join(this.backupPath, 'config');
    await fs.mkdir(configBackupPath, { recursive: true });
    
    // Backup environment files
    const envFiles = ['.env.production', '.env.staging', '.env.development'];
    
    for (const envFile of envFiles) {
      try {
        const sourcePath = path.join(process.cwd(), envFile);
        const targetPath = path.join(configBackupPath, envFile);
        await fs.copyFile(sourcePath, targetPath);
        console.log(`✅ ${envFile} backup created`);
      } catch (error) {
        console.warn(`⚠️ ${envFile} backup failed:`, error.message);
      }
    }
    
    // Backup configuration files
    const configFiles = ['nginx/nginx.conf', 'docker-compose.prod.yml', 'docker-compose.dev.yml'];
    
    for (const configFile of configFiles) {
      try {
        const sourcePath = path.join(process.cwd(), configFile);
        const targetPath = path.join(configBackupPath, configFile);
        await fs.copyFile(sourcePath, targetPath);
        console.log(`✅ ${configFile} backup created`);
      } catch (error) {
        console.warn(`⚠️ ${configFile} backup failed:`, error.message);
      }
    }
    
    return configBackupPath;
  }

  async createCombinedBackup(metadata, dbPath, filesPath, configPath) {
    const combinedPath = path.join(this.config.backupDir, `${this.backupFileName}.tar`);
    
    const tarCommand = `tar -cf "${combinedPath}" -C "${this.config.backupDir}" "${this.backupFileName}"`;
    
    try {
      await execAsync(tarCommand);
      
      // Remove individual backup directories
      await fs.rmdir(this.backupPath, { recursive: true });
      
      return combinedPath;
    } catch (error) {
      throw new Error(`Combined backup creation failed: ${error.message}`);
    }
  }

  async compressBackup(backupPath) {
    const compressedPath = `${backupPath}.gz`;
    
    const gzipCommand = `gzip -f "${backupPath}"`;
    
    try {
      await execAsync(gzipCommand);
      return compressedPath;
    } catch (error) {
      throw new Error(`Backup compression failed: ${error.message}`);
    }
  }

  async uploadToCloud(backupPath) {
    if (this.config.cloudProvider === 's3') {
      await this.uploadToS3(backupPath);
    } else if (this.config.cloudProvider === 'gcs') {
      await this.uploadToGCS(backupPath);
    } else {
      console.warn(`⚠️ Cloud provider ${this.config.cloudProvider} not supported`);
    }
  }

  async uploadToS3(backupPath) {
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    
    const fileStream = require('fs').createReadStream(backupPath);
    const fileName = path.basename(backupPath);
    
    const params = {
      Bucket: this.config.cloudBucket,
      Key: `backups/${this.timestamp}/${fileName}`,
      Body: fileStream,
      ContentType: 'application/gzip',
      StorageClass: 'STANDARD_IA'
    };
    
    try {
      await s3.upload(params).promise();
      console.log(`✅ Backup uploaded to S3: ${params.Key}`);
    } catch (error) {
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  async uploadToGCS(backupPath) {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage();
    const bucket = storage.bucket(this.config.cloudBucket);
    
    const fileName = path.basename(backupPath);
    
    try {
      await bucket.upload(backupPath, {
        destination: `backups/${this.timestamp}/${fileName}`,
        gzip: false
      });
      console.log(`✅ Backup uploaded to GCS: backups/${this.timestamp}/${fileName}`);
    } catch (error) {
      throw new Error(`GCS upload failed: ${error.message}`);
    }
  }

  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files.filter(file => file.startsWith('backup-'));
      
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      
      for (const file of backupFiles) {
        const filePath = path.join(this.config.backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`🗑️ Deleted old backup: ${file}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error.message);
    }
  }

  async copyDirectory(source, target) {
    await fs.mkdir(target, { recursive: true });
    
    const files = await fs.readdir(source);
    
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);
      
      const stats = await fs.stat(sourcePath);
      
      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }

  async verifyBackup(backupPath) {
    try {
      const stats = await fs.stat(backupPath);
      console.log(`📊 Backup size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📅 Backup created: ${stats.mtime.toISOString()}`);
      
      // Verify backup integrity (basic check)
      if (this.config.compression) {
        const testCommand = `gzip -t "${backupPath}"`;
        await execAsync(testCommand);
        console.log('✅ Backup integrity verified');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Backup verification failed:', error);
      return false;
    }
  }
}

// Restore functionality
class RestoreSystem {
  constructor() {
    this.config = {
      dbHost: process.env.DB_HOST || 'localhost',
      dbPort: process.env.DB_PORT || 5432,
      dbName: process.env.DB_NAME || 'servicenexus',
      dbUser: process.env.DB_USER || 'servicenexus_user',
      dbPassword: process.env.DB_PASSWORD || 'servicenexus123',
      backupDir: process.env.BACKUP_DIR || './backups'
    };
  }

  async restoreFromBackup(backupFile) {
    try {
      console.log('🔄 Starting ServiceNexus restore...');
      
      const backupPath = path.join(this.config.backupDir, backupFile);
      
      // Verify backup exists
      await fs.access(backupPath);
      
      // Extract backup if compressed
      const extractedPath = await this.extractBackup(backupPath);
      
      // Read metadata
      const metadata = await this.readMetadata(extractedPath);
      
      // Restore database
      console.log('📊 Restoring database...');
      await this.restoreDatabase(extractedPath);
      
      // Restore files
      console.log('📁 Restoring files...');
      await this.restoreFiles(extractedPath);
      
      // Restore configuration
      console.log('⚙️ Restoring configuration...');
      await this.restoreConfiguration(extractedPath);
      
      // Clean up extracted files
      await fs.rmdir(extractedPath, { recursive: true });
      
      console.log('✅ Restore completed successfully!');
      return { success: true, metadata };
      
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  async extractBackup(backupPath) {
    const isCompressed = backupPath.endsWith('.gz');
    const extractedPath = backupPath.replace('.gz', '').replace('.tar', '');
    
    if (isCompressed) {
      // Decompress
      const gunzipCommand = `gunzip -c "${backupPath}" | tar -xf -`;
      await execAsync(gunzipCommand, { cwd: this.config.backupDir });
    } else {
      // Extract
      const tarCommand = `tar -xf "${backupPath}"`;
      await execAsync(tarCommand, { cwd: this.config.backupDir });
    }
    
    return extractedPath;
  }

  async readMetadata(backupPath) {
    const metadataPath = path.join(backupPath, 'metadata.json');
    const metadataContent = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(metadataContent);
  }

  async restoreDatabase(backupPath) {
    const dbBackupPath = path.join(backupPath, 'database', 'database.sql');
    
    // Drop existing database
    const dropCommand = `PGPASSWORD="${this.config.dbPassword}" dropdb -h ${this.config.dbHost} -p ${this.config.dbPort} -U ${this.config.dbUser} --if-exists ${this.config.dbName}`;
    await execAsync(dropCommand);
    
    // Create new database
    const createCommand = `PGPASSWORD="${this.config.dbPassword}" createdb -h ${this.config.dbHost} -p ${this.config.dbPort} -U ${this.config.dbUser} ${this.config.dbName}`;
    await execAsync(createCommand);
    
    // Restore database
    const restoreCommand = `PGPASSWORD="${this.config.dbPassword}" psql -h ${this.config.dbHost} -p ${this.config.dbPort} -U ${this.config.dbUser} -d ${this.config.dbName} -f "${dbBackupPath}"`;
    await execAsync(restoreCommand);
    
    console.log('✅ Database restored');
  }

  async restoreFiles(backupPath) {
    const filesBackupPath = path.join(backupPath, 'files');
    
    // Restore uploads
    const uploadsSource = path.join(filesBackupPath, 'uploads');
    const uploadsTarget = process.env.UPLOAD_DIR || './uploads';
    
    if (await fs.access(uploadsSource).then(() => true).catch(() => false)) {
      await this.copyDirectory(uploadsSource, uploadsTarget);
      console.log('✅ Uploads restored');
    }
    
    // Restore logs
    const logsSource = path.join(filesBackupPath, 'logs');
    const logsTarget = process.env.LOG_FILE ? path.dirname(process.env.LOG_FILE) : './logs';
    
    if (await fs.access(logsSource).then(() => true).catch(() => false)) {
      await this.copyDirectory(logsSource, logsTarget);
      console.log('✅ Logs restored');
    }
  }

  async restoreConfiguration(backupPath) {
    const configBackupPath = path.join(backupPath, 'config');
    
    if (await fs.access(configBackupPath).then(() => true).catch(() => false)) {
      const files = await fs.readdir(configBackupPath);
      
      for (const file of files) {
        const sourcePath = path.join(configBackupPath, file);
        const targetPath = path.join(process.cwd(), file);
        
        await fs.copyFile(sourcePath, targetPath);
        console.log(`✅ ${file} restored`);
      }
    }
  }

  async copyDirectory(source, target) {
    await fs.mkdir(target, { recursive: true });
    
    const files = await fs.readdir(source);
    
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);
      
      const stats = await fs.stat(sourcePath);
      
      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const backupFile = process.argv[3];
  
  if (command === 'backup') {
    const backupSystem = new BackupSystem();
    await backupSystem.runBackup();
  } else if (command === 'restore') {
    if (!backupFile) {
      console.error('❌ Please specify backup file to restore');
      process.exit(1);
    }
    
    const restoreSystem = new RestoreSystem();
    await restoreSystem.restoreFromBackup(backupFile);
  } else if (command === 'list') {
    const backupDir = process.env.BACKUP_DIR || './backups';
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.startsWith('backup-'));
    
    console.log('📋 Available backups:');
    backupFiles.forEach(file => {
      const filePath = path.join(backupDir, file);
      fs.stat(filePath).then(stats => {
        console.log(`  ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB, ${stats.mtime.toISOString()})`);
      }).catch(() => {
        console.log(`  ${file}`);
      });
    });
  } else {
    console.log('📖 ServiceNexus Backup System');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/backup.js backup     - Create a new backup');
    console.log('  node scripts/backup.js restore <file> - Restore from backup');
    console.log('  node scripts/backup.js list       - List available backups');
    process.exit(1);
  }
}

// Export for use in other modules
module.exports = { BackupSystem, RestoreSystem };

// Run CLI if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
