/**
 * WhatSaas - Automated Backup Script (Reliable Version)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipe = promisify(pipeline);

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DATE_STR = new Date().toISOString().replace(/[:.]/g, '-');
const PG_CONTAINER = 'wathsaas-postgres';
const DB_NAME = 'wathsaas';
const DB_USER = 'wathsaas';

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function runBackup() {
  console.log(`🚀 Starting backup sequence at ${new Date().toISOString()}...`);

  try {
    const tempInContainer = `/tmp/db-${DATE_STR}.sql`;
    const localPath = path.join(BACKUP_DIR, `db-${DATE_STR}.sql`);

    // 1. PostgreSQL Backup inside container
    console.log('📦 Dumping PostgreSQL inside container...');
    execSync(`docker exec ${PG_CONTAINER} pg_dump -U ${DB_USER} -f ${tempInContainer} ${DB_NAME}`);
    
    // 2. Copy from container to host
    console.log('🚚 Copying dump to host...');
    execSync(`docker cp ${PG_CONTAINER}:${tempInContainer} ${localPath}`);
    
    // 3. Remove temp file in container
    console.log('🧹 Cleaning up container...');
    execSync(`docker exec ${PG_CONTAINER} rm ${tempInContainer}`);

    // 4. Compress DB Backup (Native Node.js)
    console.log('🗜️ Compressing DB backup...');
    const gzip = zlib.createGzip();
    const source = fs.createReadStream(localPath);
    const destination = fs.createWriteStream(`${localPath}.gz`);
    await pipe(source, gzip, destination);
    fs.unlinkSync(localPath); 
    
    console.log(`✅ Backup saved and compressed: ${localPath}.gz`);

    // 5. Redis Backup Trigger
    console.log('📦 Triggering Redis Save...');
    execSync(`docker exec wathsaas-redis redis-cli save`);

    // 6. Rotation (Keep only last 7 days)
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > SEVEN_DAYS) {
        fs.unlinkSync(filePath);
      }
    });

    console.log('✨ Backup sequence completed successfully!');
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

runBackup();
