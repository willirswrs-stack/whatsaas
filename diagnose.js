const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function diagnose() {
    await ssh.connect({
        host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000
    });

    console.log('\n============================================');
    console.log('1. STATUS DOS CONTAINERS');
    console.log('============================================');
    const containers = await ssh.execCommand('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"');
    console.log(containers.stdout);

    console.log('\n============================================');
    console.log('2. ÚLTIMAS LINHAS DO LOG DO BACKEND (erros)');
    console.log('============================================');
    const logs = await ssh.execCommand('docker logs whatsaas-backend --tail 100 2>&1 | grep -E "(ERROR|error|Error|dispatcher|Flow|Instance|send|WARN)" | tail -60');
    console.log(logs.stdout || logs.stderr || '(sem output)');

    console.log('\n============================================');
    console.log('3. VERIFICANDO INSTÂNCIAS NO BANCO DE DADOS');
    console.log('============================================');
    const instances = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d whatsaas -c "SELECT id, \\"instanceName\\", status, provider FROM instances LIMIT 10;"`);
    console.log(instances.stdout || instances.stderr);

    console.log('\n============================================');
    console.log('4. CAMPANHAS EM EXECUÇÃO');
    console.log('============================================');
    const campaigns = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d whatsaas -c "SELECT id, name, status, \\"sentCount\\" FROM campaigns WHERE status = 'running' ORDER BY \\"updatedAt\\" DESC LIMIT 5;"`);
    console.log(campaigns.stdout || campaigns.stderr);

    console.log('\n============================================');
    console.log('5. CONTATOS DAS CAMPANHAS RECENTES (status)');
    console.log('============================================');
    const contacts = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d whatsaas -c "SELECT cc.status, COUNT(*) FROM campaign_contacts cc JOIN campaigns c ON cc.\\"campaignId\\" = c.id WHERE c.status = 'running' GROUP BY cc.status;"`);
    console.log(contacts.stdout || contacts.stderr);

    console.log('\n============================================');
    console.log('6. ÚLTIMOS ERROS NO DISPATCHER (BullMQ)');
    console.log('============================================');
    const dispatcher = await ssh.execCommand('docker logs whatsaas-backend --tail 200 2>&1 | grep -i "dispatcher\\|bull\\|queue\\|job" | tail -40');
    console.log(dispatcher.stdout || '(sem output)');

    console.log('\n============================================');
    console.log('7. TESTE DIRETO NA EVOLUTION API');
    console.log('============================================');
    const instances2 = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d whatsaas -c "SELECT \\"instanceName\\", status, provider FROM instances WHERE status = 'connected' LIMIT 3;"`);
    console.log(instances2.stdout || instances2.stderr);

    // Pegar o instanceName conectado para testar
    const instResult = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d whatsaas -t -c "SELECT \\"instanceName\\" FROM instances WHERE status = 'connected' LIMIT 1;"`);
    const instanceName = instResult.stdout.trim();
    
    if (instanceName) {
        console.log(`\nTestando Evolution API para instância: ${instanceName}`);
        const evolutionTest = await ssh.execCommand(`curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/instance/fetchInstances -H "apikey: mude-esta-chave-urgente"`);
        console.log('Evolution API HTTP Status:', evolutionTest.stdout);
        
        const evolutionDetail = await ssh.execCommand(`curl -s http://localhost:8080/instance/connectionState/${instanceName} -H "apikey: mude-esta-chave-urgente" | head -c 500`);
        console.log('Evolution connection state:', evolutionDetail.stdout);
    }

    process.exit(0);
}

diagnose().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
