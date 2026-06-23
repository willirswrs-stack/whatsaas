const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function rebuildFrontend() {
    console.log('🔨 Rebuild do frontend Next.js na VPS...\n');
    await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 120000 });

    // 1. Verificar se o source está em /root/whatsaas/frontend
    const hasSrc = await ssh.execCommand('test -f /root/whatsaas/frontend/src/components/ClientLayout.tsx && echo YES || echo NO');
    console.log('Source em /root/whatsaas/frontend:', hasSrc.stdout.trim());

    // 2. Verificar se o ClientLayout já tem a correção
    const check = await ssh.execCommand('grep -c "isAdminRoute" /root/whatsaas/frontend/src/components/ClientLayout.tsx 2>&1');
    console.log('Correção isAdminRoute já aplicada:', check.stdout.trim() !== '0' ? '✅ SIM' : '❌ NÃO');

    // 3. Verificar se node_modules existe no source
    const hasModules = await ssh.execCommand('test -d /root/whatsaas/frontend/node_modules && echo YES || echo NO');
    console.log('node_modules em /root/whatsaas/frontend:', hasModules.stdout.trim());

    // 4. Instalar dependências se necessário
    if (hasModules.stdout.trim() === 'NO') {
        console.log('\n📦 Instalando dependências do frontend...');
        const install = await ssh.execCommand(
            'cd /root/whatsaas/frontend && npm install --production=false 2>&1 | tail -5',
            { execOptions: { pty: false } }
        );
        console.log(install.stdout || install.stderr);
    }

    // 5. Build do Next.js a partir do source na VPS
    console.log('\n🔨 Executando next build (pode levar 2-3 min)...');
    const buildRes = await ssh.execCommand(
        'cd /root/whatsaas/frontend && NEXT_PUBLIC_API_URL=https://api.whatsaas.online/api/v1 NEXT_PUBLIC_EVOLUTION_URL=https://evolution.whatsaas.online npm run build 2>&1 | tail -20',
        { execOptions: { pty: false } }
    );
    console.log(buildRes.stdout || buildRes.stderr);

    // 6. Copiar o .next gerado para dentro do container
    console.log('\n📋 Copiando .next para dentro do container frontend...');
    
    // Primeiro, verificar se o build gerou o .next
    const buildCheck = await ssh.execCommand('test -d /root/whatsaas/frontend/.next && echo YES || echo NO');
    if (buildCheck.stdout.trim() === 'YES') {
        const cpNext = await ssh.execCommand(
            'docker cp /root/whatsaas/frontend/.next whatsaas-frontend:/app/.next 2>&1'
        );
        console.log('docker cp .next:', cpNext.stdout || cpNext.stderr || 'OK');

        // Também copiar o standalone se existir
        const cpStandalone = await ssh.execCommand(
            'docker cp /root/whatsaas/frontend/.next/standalone/. whatsaas-frontend:/app/ 2>&1'
        );
        console.log('docker cp standalone:', cpStandalone.stdout || cpStandalone.stderr || 'OK');
    } else {
        console.log('❌ Build não gerou .next — verificar logs acima');
        ssh.dispose();
        return;
    }

    // 7. Restart do container frontend
    console.log('\n🔄 Reiniciando frontend...');
    const restart = await ssh.execCommand('docker restart whatsaas-frontend 2>&1');
    console.log(restart.stdout.trim());

    await new Promise(r => setTimeout(r, 15000));

    // 8. Status final
    const status = await ssh.execCommand('docker ps --format "table {{.Names}}\\t{{.Status}}"');
    console.log('\n📊 STATUS FINAL:');
    console.log(status.stdout);

    ssh.dispose();
    console.log('\n✅ Frontend rebuild concluído!');
}

rebuildFrontend().catch(e => { console.error('ERRO:', e.message); try { ssh.dispose(); } catch(_) {} });
