const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function applyFix() {
    try {
        await ssh.connect(config);
        console.log('🔌 Conectado via SSH!');

        // 1. Add the column global_config to tenant_settings if it doesn't exist
        const alterCmd = 'docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS global_config jsonb NOT NULL DEFAULT \'{}\';"';
        console.log(`Running: ${alterCmd}`);
        const alterRes = await ssh.execCommand(alterCmd);
        console.log('ALTER TABLE response:', alterRes.stdout || alterRes.stderr);

        // 2. Insert the migration log
        const insertCmd = 'docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "INSERT INTO migrations (timestamp, name) VALUES (1781142683882, \'AddGlobalConfigToTenantSettings1781142683882\') ON CONFLICT DO NOTHING;"';
        console.log(`Running: ${insertCmd}`);
        const insertRes = await ssh.execCommand(insertCmd);
        console.log('INSERT INTO migrations response:', insertRes.stdout || insertRes.stderr);

        // 3. Verify the table schema
        console.log('\n--- VERIFYING SCHEMA ---');
        const schemaRes = await ssh.execCommand('docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "\\d tenant_settings"');
        console.log(schemaRes.stdout || schemaRes.stderr);

        // 4. Verify migrations
        console.log('\n--- VERIFYING MIGRATIONS ---');
        const migRes = await ssh.execCommand('docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 3;"');
        console.log(migRes.stdout || migRes.stderr);

        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
applyFix();
