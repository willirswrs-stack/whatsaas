const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function verify() {
    try {
        console.log('🔌 Conectando ao servidor VPS (2.25.159.205)...');
        await ssh.connect(config);
        console.log('✅ Conectado!');

        console.log('\n🔄 --- RESTARTING BACKEND CONTAINER ---');
        await ssh.execCommand('docker restart whatsaas-backend');
        console.log('Aguardando 8 segundos para a inicialização...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        console.log('\n🐳 --- CONTAINER STATUS (docker ps) ---');
        const psRes = await ssh.execCommand('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"');
        console.log(psRes.stdout || psRes.stderr);

        console.log('\n🪵 --- BACKEND RECENT LOGS (docker logs whatsaas-backend) ---');
        const logsRes = await ssh.execCommand('docker logs whatsaas-backend --tail 50');
        console.log(logsRes.stdout || logsRes.stderr);

        console.log('\n🏥 --- API HEALTH CHECK ---');
        const healthRes = await ssh.execCommand('curl -s http://localhost:3333/api/v1/health');
        console.log('Status do Health Check via Host Curl:', healthRes.stdout || healthRes.stderr);

        console.log('\n🏥 --- API HEALTH CHECK INSIDE CONTAINER (wget) ---');
        const wgetRes = await ssh.execCommand('docker exec whatsaas-backend wget -S -O- http://127.0.0.1:3333/api/v1/health');
        console.log('Exit code:', wgetRes.code);
        console.log('Stdout:', wgetRes.stdout);
        console.log('Stderr:', wgetRes.stderr);

        console.log('\n🗄️ --- RUNNING DATABASE MIGRATIONS ---');
        const migrateRes = await ssh.execCommand('docker exec whatsaas-backend node node_modules/typeorm/cli.js migration:run -d dist/src/config/database.config.js');
        console.log('Exit code:', migrateRes.code);
        console.log('Stdout:', migrateRes.stdout);
        console.log('Stderr:', migrateRes.stderr);

        console.log('\n🗄️ --- ADDING MISSING TENANTS COLUMNS MANUALLY ---');
        const alterRes = await ssh.execCommand('docker exec -t whatsaas-postgres psql -U postgres -d wathsaas -c "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS asaas_customer_id character varying; ALTER TABLE tenants ADD COLUMN IF NOT EXISTS asaas_subscription_id character varying; ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_tokens_consumed integer DEFAULT 0; ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_tokens_cost numeric(10,4) DEFAULT 0;"');
        console.log('Exit code:', alterRes.code);
        console.log('Stdout:', alterRes.stdout);
        console.log('Stderr:', alterRes.stderr);

        console.log('\n🌱 --- RUNNING DATABASE SEED ---');
        const seedRes = await ssh.execCommand('docker exec whatsaas-backend node dist/src/scripts/seed.js');
        console.log('Exit code:', seedRes.code);
        console.log('Stdout:', seedRes.stdout);
        console.log('Stderr:', seedRes.stderr);

        ssh.dispose();
    } catch (e) {
        console.error('❌ Erro durante as verificações:', e);
        ssh.dispose();
    }
}
verify();
