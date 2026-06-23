const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restoreDeploy() {
    console.log('🔧 Restaurando com JS compilado correto...\n');
    await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000 });

    // 1. Enviar o JS compilado corretamente para a VPS
    console.log('1. Enviando groq.adapter.js compilado para VPS...');
    await ssh.putFile(
        'C:/Users/Usuario/whatsaas/backend/dist_groq_tmp/groq.adapter.js',
        '/root/groq.adapter.js'
    );
    console.log('   ✅ Arquivo enviado!');

    // 2. Aguardar o container sair do estado de restart
    console.log('\n2. Aguardando container whatsaas-backend sair do restart loop...');
    await new Promise(r => setTimeout(r, 8000));

    // 3. Copiar JS compilado para dentro do container
    console.log('\n3. Copiando JS compilado para dentro do container...');
    const cp = await ssh.execCommand(
        'docker cp /root/groq.adapter.js whatsaas-backend:/app/dist/src/modules/ai/providers/groq.adapter.js 2>&1'
    );
    console.log('   docker cp:', cp.stdout || cp.stderr || 'OK');

    // 4. Restart do backend
    console.log('\n4. Reiniciando backend...');
    const restart = await ssh.execCommand('docker restart whatsaas-backend 2>&1');
    console.log('   :', restart.stdout.trim());

    // 5. Aguardar subir
    console.log('\n5. Aguardando 20s...');
    await new Promise(r => setTimeout(r, 20000));

    // 6. Status final
    const status = await ssh.execCommand('docker ps --format "table {{.Names}}\\t{{.Status}}"');
    console.log('\n📊 STATUS:');
    console.log(status.stdout);

    // 7. Verificar se backend subiu OK
    const logs = await ssh.execCommand('docker logs whatsaas-backend --tail 5 2>&1');
    console.log('\n📋 ÚLTIMAS LINHAS DO BACKEND:');
    console.log(logs.stdout || logs.stderr);

    ssh.dispose();
}

restoreDeploy().catch(e => { console.error(e.message); try { ssh.dispose(); } catch(_) {} });
