const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function runMigration() {
    console.log('🔄 Executando migration na VPS...');
    await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 60000 });

    const migration = await ssh.execCommand(
        'docker exec whatsaas-backend npx typeorm migration:run -d dist/src/config/database.config.js 2>&1'
    );
    console.log(migration.stdout || migration.stderr);

    ssh.dispose();
    console.log('✅ Concluído.');
}

runMigration().catch(e => { console.error('ERRO:', e.message); try { ssh.dispose(); } catch(_) {} });
