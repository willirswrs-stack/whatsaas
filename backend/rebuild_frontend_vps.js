const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function rebuildFrontendVPS() {
    console.log('🔧 Reconstruindo o frontend via docker-compose na VPS...\n');
    await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000 });

    // 1. Atualizar ClientLayout.tsx no diretório correto (/var/www/whatsaas)
    console.log('1. Atualizando ClientLayout.tsx...');
    await ssh.putFile(
        'C:/Users/Usuario/whatsaas/frontend/src/components/ClientLayout.tsx',
        '/var/www/whatsaas/frontend/src/components/ClientLayout.tsx'
    );
    console.log('   ✅ Arquivo atualizado.');

    // 2. Rebuild do container frontend usando docker-compose
    console.log('\n2. Reconstruindo a imagem do frontend (isso levará alguns minutos)...');
    const build = await ssh.execCommand(
        'cd /var/www/whatsaas && docker compose -f docker-compose.prod.yml build frontend 2>&1 | tail -20',
        { execOptions: { pty: false } }
    );
    console.log(build.stdout || build.stderr);

    // 3. Subir o container
    console.log('\n3. Iniciando o novo container frontend...');
    const up = await ssh.execCommand(
        'cd /var/www/whatsaas && docker compose -f docker-compose.prod.yml up -d frontend 2>&1'
    );
    console.log(up.stdout || up.stderr);

    // 4. Aguardar um pouco para estabilizar
    console.log('\n4. Aguardando container estabilizar...');
    await new Promise(r => setTimeout(r, 15000));

    // 5. Verificar logs
    const logs = await ssh.execCommand('docker logs whatsaas-frontend --tail 10 2>&1');
    console.log('\n📋 LOGS DO FRONTEND:');
    console.log(logs.stdout || logs.stderr);

    // 6. Verificar status
    const status = await ssh.execCommand('docker ps --format "table {{.Names}}\\t{{.Status}}" | grep frontend');
    console.log('\n📊 STATUS FINAL:');
    console.log(status.stdout || status.stderr);

    ssh.dispose();
}

rebuildFrontendVPS().catch(e => { console.error(e.message); try { ssh.dispose(); } catch(_) {} });
