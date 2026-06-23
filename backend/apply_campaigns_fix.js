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
        console.log('✅ Conectado via SSH!');

        const alterCmd1 = 'docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS parent_campaign_id uuid;"';
        const alterCmd2 = 'docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS targeting_rules jsonb NOT NULL DEFAULT \'{}\';"';

        console.log(`Running: ${alterCmd1}`);
        const res1 = await ssh.execCommand(alterCmd1);
        console.log(res1.stdout || res1.stderr);

        console.log(`Running: ${alterCmd2}`);
        const res2 = await ssh.execCommand(alterCmd2);
        console.log(res2.stdout || res2.stderr);

        // Verify the table schema
        console.log('\n--- VERIFYING SCHEMA ---');
        const schemaRes = await ssh.execCommand('docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "\\d campaigns"');
        console.log(schemaRes.stdout || schemaRes.stderr);

        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
applyFix();
