const { Client } = require('pg');
const { NodeSSH } = require('node-ssh');

// Configuration for remote SSH
const sshConfig = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

// Configuration for local PostgreSQL
const localDbConfig = {
    host: 'localhost',
    port: 5433,
    user: 'wathsaas',
    password: 'wathsaas_secret_2024',
    database: 'wathsaas'
};

async function fixLocalDb() {
    console.log('🔌 Connecting to local database...');
    const client = new Client(localDbConfig);
    try {
        await client.connect();
        console.log('✅ Connected to local database.');
        
        console.log('Adding "provider" column to "proxies" table locally...');
        await client.query(`ALTER TABLE proxies ADD COLUMN IF NOT EXISTS provider character varying DEFAULT 'iproyal'`);
        console.log('✅ "provider" column added locally successfully.');
    } catch (err) {
        console.error('❌ Failed to fix local database:', err.message);
    } finally {
        await client.end();
    }
}

async function fixRemoteDb() {
    console.log('🔌 Connecting to remote VPS via SSH...');
    const ssh = new NodeSSH();
    try {
        await ssh.connect(sshConfig);
        console.log('✅ Connected to remote VPS.');
        
        console.log('Adding "provider" column to "proxies" table in remote postgres container...');
        const sqlCmd = 'docker exec -t whatsaas-postgres psql -U postgres -d wathsaas -c "ALTER TABLE proxies ADD COLUMN IF NOT EXISTS provider character varying DEFAULT \'iproyal\';"';
        console.log(`Running remote command: ${sqlCmd}`);
        const sqlRes = await ssh.execCommand(sqlCmd);
        console.log('Exit code:', sqlRes.code);
        console.log('Stdout:', sqlRes.stdout);
        console.log('Stderr:', sqlRes.stderr);
        
        console.log('🔄 Restarting remote backend container...');
        const restartRes = await ssh.execCommand('docker restart whatsaas-backend');
        console.log('Restart response:', restartRes.stdout || restartRes.stderr);
        
    } catch (err) {
        console.error('❌ Failed to fix remote VPS/database:', err.message);
    } finally {
        ssh.dispose();
    }
}

async function run() {
    await fixLocalDb();
    await fixRemoteDb();
    console.log('🎉 DB Fix completed.');
}

run();
