const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deploy() {
    console.log('🚀 Iniciando deploy dos fixes...\n');
    await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000 });

    // Upload dos arquivos corrigidos
    console.log('📤 Enviando arquivos corrigidos para a VPS...');
    await ssh.putFile(
        'C:/Users/Usuario/whatsaas/frontend/src/components/ClientLayout.tsx',
        '/root/whatsaas/frontend/src/components/ClientLayout.tsx'
    );
    await ssh.putFile(
        'C:/Users/Usuario/whatsaas/backend/src/modules/ai/providers/groq.adapter.ts',
        '/root/whatsaas/backend/src/modules/ai/providers/groq.adapter.ts'
    );
    console.log('✅ Arquivos enviados!\n');

    // Rebuild e restart dos containers
    console.log('🔨 Rebuilding containers (backend + frontend)...');
    const buildRes = await ssh.execCommand(
        'cd /root/whatsaas && docker compose -f docker-compose.prod.yml build --no-cache backend frontend 2>&1 | tail -30',
        { execOptions: { pty: false } }
    );
    console.log(buildRes.stdout || buildRes.stderr);

    console.log('\n🔄 Reiniciando containers...');
    const restartRes = await ssh.execCommand(
        'cd /root/whatsaas && docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend 2>&1'
    );
    console.log(restartRes.stdout || restartRes.stderr);

    // Aguardar containers ficarem healthy
    console.log('\n⏳ Aguardando containers ficarem saudáveis...');
    await new Promise(r => setTimeout(r, 15000));

    const statusRes = await ssh.execCommand('docker ps --format "table {{.Names}}\\t{{.Status}}"');
    console.log(statusRes.stdout);

    ssh.dispose();
    console.log('\n✅ Deploy concluído!');
}

deploy().catch(e => { console.error(e.message); try { ssh.dispose(); } catch(_) {} });
