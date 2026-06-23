/**
 * Deploy via docker cp — copia arquivos direto nos containers sem precisar do docker-compose
 */
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deploy() {
    console.log('🚀 Deploy via docker cp...\n');
    await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000 });

    // ─── 1. Verificar onde os arquivos foram enviados ───
    console.log('1. Verificando arquivos enviados em /root/whatsaas...');
    const lsRes = await ssh.execCommand('ls /root/whatsaas/ 2>&1');
    console.log(lsRes.stdout || lsRes.stderr);

    const groqExists = await ssh.execCommand('ls /root/whatsaas/backend/src/modules/ai/providers/groq.adapter.ts 2>&1');
    console.log('groq.adapter.ts:', groqExists.stdout || groqExists.stderr);

    const layoutExists = await ssh.execCommand('ls /root/whatsaas/frontend/src/components/ClientLayout.tsx 2>&1');
    console.log('ClientLayout.tsx:', layoutExists.stdout || layoutExists.stderr);

    // ─── 2. Copiar para dentro dos containers via docker cp ───
    console.log('\n2. Copiando arquivos para dentro dos containers...');

    // Backend: groq.adapter.ts
    const cp1 = await ssh.execCommand(
        'docker cp /root/whatsaas/backend/src/modules/ai/providers/groq.adapter.ts whatsaas-backend:/app/src/modules/ai/providers/groq.adapter.ts 2>&1'
    );
    console.log('  groq.adapter.ts -> backend:', cp1.stdout || cp1.stderr || 'OK');

    // Frontend: ClientLayout.tsx
    const cp2 = await ssh.execCommand(
        'docker cp /root/whatsaas/frontend/src/components/ClientLayout.tsx whatsaas-frontend:/app/src/components/ClientLayout.tsx 2>&1'
    );
    console.log('  ClientLayout.tsx -> frontend:', cp2.stdout || cp2.stderr || 'OK');

    // ─── 3. Verificar caminho real dentro dos containers ───
    console.log('\n3. Verificando caminhos reais dentro dos containers...');
    const backendPath = await ssh.execCommand(
        'docker exec -i whatsaas-backend find /app -name "groq.adapter*" 2>&1 | head -3'
    );
    console.log('  Backend groq path:', backendPath.stdout || '(não encontrado em /app)');

    const frontendPath = await ssh.execCommand(
        'docker exec -i whatsaas-frontend find /app -name "ClientLayout*" 2>&1 | head -3'
    );
    console.log('  Frontend layout path:', frontendPath.stdout || '(não encontrado em /app)');

    // ─── 4. Se os paths estiverem errados, tentar copiar para o caminho correto ───
    if (!backendPath.stdout.includes('groq.adapter')) {
        console.log('\n  ⚠️  Procurando path correto no backend...');
        const findBackend = await ssh.execCommand(
            'docker exec -i whatsaas-backend sh -c "ls /dist/src/modules/ai/providers/ 2>/dev/null || ls /home/node/app/src/modules/ai/providers/ 2>/dev/null || find / -name groq.adapter.js 2>/dev/null | head -5"'
        );
        console.log('  Backend paths encontrados:', findBackend.stdout);
    }

    // ─── 5. Restart dos containers ───
    console.log('\n4. Reiniciando containers...');
    const restartBackend = await ssh.execCommand('docker restart whatsaas-backend 2>&1');
    console.log('  backend:', restartBackend.stdout || restartBackend.stderr);

    const restartFrontend = await ssh.execCommand('docker restart whatsaas-frontend 2>&1');
    console.log('  frontend:', restartFrontend.stdout || restartFrontend.stderr);

    // ─── 6. Aguardar e verificar status ───
    console.log('\n5. Aguardando 20s para os containers subirem...');
    await new Promise(r => setTimeout(r, 20000));

    const statusRes = await ssh.execCommand('docker ps --format "table {{.Names}}\\t{{.Status}}"');
    console.log(statusRes.stdout);

    ssh.dispose();
    console.log('\n✅ Deploy concluído!');
}

deploy().catch(e => { console.error(e.message); try { ssh.dispose(); } catch(_) {} });
