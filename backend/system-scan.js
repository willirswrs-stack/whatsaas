const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function runCommand(cmd, label) {
    const res = await ssh.execCommand(cmd);
    return res.stdout || res.stderr;
}

async function main() {
    try {
        await ssh.connect(config);
        console.log('🔌 Conectado à VPS.');

        // 1. Get database table counts
        const tables = [
            'users', 'tenants', 'Contact', 'contacts', 
            'Instance', 'instances', 'flows', 'flow_executions', 
            'Message', 'messages', 'chip_details', 'migrations'
        ];
        
        console.log('\n--- CONTAGEM DE REGISTROS DO BANCO DE DADOS ---');
        for (const table of tables) {
            const countStr = await runCommand(
                `docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -t -A -c "SELECT COUNT(*) FROM \\"${table}\\"" 2>&1`,
                table
            );
            console.log(`${table}: ${countStr.trim()}`);
        }

        // 2. Get backend logs since restart (whatsaas-backend was restarted ~15 mins ago)
        console.log('\n--- LOGS RECENTES DO BACKEND DESDE A INICIALIZAÇÃO ---');
        const logs = await runCommand('docker logs whatsaas-backend --since 20m 2>&1');
        console.log(logs || '(Sem logs nos últimos 20 minutos)');

        ssh.dispose();
    } catch (e) {
        console.error('Erro:', e);
        try { ssh.dispose(); } catch (_) {}
    }
}

main();
