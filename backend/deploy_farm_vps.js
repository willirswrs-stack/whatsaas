const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deployFarmVPS() {
    console.log('🚀 Iniciando deploy completo na VPS...\n');
    await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 60000 });

    // 1. Pull Git repository
    console.log('1. Puxando as atualizações do GitHub...');
    const pull = await ssh.execCommand('cd /var/www/whatsaas && git pull origin main 2>&1');
    console.log(pull.stdout || pull.stderr);

    // 2. Build Docker containers
    console.log('\n2. Reconstruindo as imagens do Backend e Frontend (Aguarde alguns minutos)...');
    const build = await ssh.execCommand(
        'cd /var/www/whatsaas && docker compose -f docker-compose.prod.yml build backend frontend 2>&1 | tail -20',
        { execOptions: { pty: false } }
    );
    console.log(build.stdout || build.stderr);

    // 3. Up Docker containers
    console.log('\n3. Iniciando os containers com a nova versão...');
    const up = await ssh.execCommand(
        'cd /var/www/whatsaas && docker compose -f docker-compose.prod.yml up -d backend frontend 2>&1'
    );
    console.log(up.stdout || up.stderr);

    console.log('\n4. Aguardando 15 segundos para o backend inicializar completamente...');
    await new Promise(r => setTimeout(r, 15000));

    // 4. Executar Migrations do Banco de Dados
    console.log('\n5. Executando as migrations do banco de dados (criando tabela chip_details)...');
    const migration = await ssh.execCommand(
        'docker exec whatsaas-backend npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d src/config/database.config.ts 2>&1'
    );
    console.log(migration.stdout || migration.stderr);

    // 5. Verificar logs rápidos
    const logs = await ssh.execCommand('docker ps --format "table {{.Names}}\\t{{.Status}}" | grep -E "backend|frontend"');
    console.log('\n📊 STATUS FINAL DOS CONTAINERS:');
    console.log(logs.stdout);

    ssh.dispose();
    console.log('\n✅ Deploy finalizado com sucesso!');
}

deployFarmVPS().catch(e => { console.error('ERRO:', e.message); try { ssh.dispose(); } catch(_) {} });
