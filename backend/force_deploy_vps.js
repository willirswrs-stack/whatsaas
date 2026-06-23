const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function forceDeployVPS() {
    console.log('🚀 Iniciando deploy forçado na VPS...\n');
    await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 60000 });

    // 1. Force Pull Git repository
    console.log('1. Forçando o pull das atualizações do GitHub...');
    const pull = await ssh.execCommand('cd /var/www/whatsaas && git fetch origin && git reset --hard origin/main && git clean -fd 2>&1');
    console.log(pull.stdout || pull.stderr);

    // 2. Build Docker containers
    console.log('\n2. Reconstruindo as imagens do Backend e Frontend (Aguarde)...');
    const build = await ssh.execCommand(
        'cd /var/www/whatsaas && docker compose -f docker-compose.prod.yml build backend frontend 2>&1 | tail -30',
        { execOptions: { pty: false } }
    );
    console.log(build.stdout || build.stderr);

    // 3. Up Docker containers
    console.log('\n3. Iniciando os containers com a nova versão...');
    const up = await ssh.execCommand(
        'cd /var/www/whatsaas && docker compose -f docker-compose.prod.yml up -d backend frontend 2>&1'
    );
    console.log(up.stdout || up.stderr);

    console.log('\n4. Aguardando inicialização do backend...');
    await new Promise(r => setTimeout(r, 15000));

    // 5. Executar Migrations do Banco de Dados
    console.log('\n5. Executando as migrations do banco de dados (criando tabela chip_details)...');
    const migration = await ssh.execCommand(
        'docker exec whatsaas-backend npx typeorm migration:run -d dist/src/config/database.config.js 2>&1'
    );
    console.log(migration.stdout || migration.stderr);

    ssh.dispose();
    console.log('\n✅ Deploy finalizado com sucesso!');
}

forceDeployVPS().catch(e => { console.error('ERRO:', e.message); try { ssh.dispose(); } catch(_) {} });
