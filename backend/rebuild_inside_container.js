const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function rebuildInsideContainer() {
    console.log('🔨 Rebuild dentro do container frontend...\n');
    await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 120000 });

    // 1. Copiar o ClientLayout corrigido para dentro do container
    console.log('1. Copiando ClientLayout.tsx corrigido para dentro do container...');
    const cp1 = await ssh.execCommand(
        'docker cp /root/whatsaas/frontend/src/components/ClientLayout.tsx whatsaas-frontend:/app/src/components/ClientLayout.tsx 2>&1'
    );
    console.log('   Resultado:', cp1.stdout || cp1.stderr);

    // 2. Verificar se o source existe no container
    const hasSrc2 = await ssh.execCommand(
        'docker exec -i whatsaas-frontend sh -c "test -f /app/src/components/ClientLayout.tsx && echo YES || echo NO" 2>&1'
    );
    console.log('   Source no container:', hasSrc2.stdout.trim());

    // 3. Se não tem source, tentar copiar o diretório inteiro
    if (hasSrc2.stdout.trim() !== 'YES') {
        console.log('\n   Sem source no container. Copiando src completo...');
        const cpSrc = await ssh.execCommand(
            'docker cp /root/whatsaas/frontend/src whatsaas-frontend:/app/src 2>&1'
        );
        console.log('   Cópia de /src:', cpSrc.stdout || cpSrc.stderr || 'OK');
    }

    // 4. Verificar estrutura do container para ver se tem node_modules
    const hasNM = await ssh.execCommand(
        'docker exec -i whatsaas-frontend sh -c "test -d /app/node_modules && echo YES || echo NO" 2>&1'
    );
    console.log('\n2. node_modules no container:', hasNM.stdout.trim());

    // 5. Tentar rodar o build dentro do container
    console.log('\n3. Rodando next build dentro do container (aguarde ~3 min)...');
    const buildRes = await ssh.execCommand(
        'docker exec -i whatsaas-frontend sh -c "cd /app && NEXT_PUBLIC_API_URL=https://api.whatsaas.online/api/v1 NEXT_PUBLIC_EVOLUTION_URL=https://evolution.whatsaas.online npx next build 2>&1 | tail -30"',
        { execOptions: { pty: false } }
    );
    console.log(buildRes.stdout || buildRes.stderr);

    // 6. Restart
    console.log('\n4. Reiniciando frontend...');
    const restart = await ssh.execCommand('docker restart whatsaas-frontend 2>&1');
    console.log('   :', restart.stdout.trim());

    await new Promise(r => setTimeout(r, 15000));

    const status = await ssh.execCommand('docker ps --format "table {{.Names}}\\t{{.Status}}"');
    console.log('\n📊 STATUS:');
    console.log(status.stdout);

    ssh.dispose();
    console.log('\n✅ Concluído!');
}

rebuildInsideContainer().catch(e => { console.error('ERRO:', e.message); try { ssh.dispose(); } catch(_) {} });
