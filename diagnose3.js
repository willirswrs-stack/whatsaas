const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function diagnose() {
    await ssh.connect({
        host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000
    });

    const db = 'wathsaas';
    const apiKey = '429683C4C977415CAAFCCE10F7D57E11';

    console.log('\n============================================');
    console.log('1. INSTÂNCIAS CONECTADAS');
    console.log('============================================');
    const instances = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT instance_name, status, provider FROM instances WHERE status='connected' LIMIT 5;"`);
    console.log(instances.stdout || instances.stderr);

    const instNameResult = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -t -c "SELECT instance_name FROM instances WHERE status='connected' LIMIT 1;"`);
    const instName = instNameResult.stdout.trim();
    console.log('Instância conectada:', instName);

    console.log('\n============================================');
    console.log('2. FLOW EXECUTIONS STATUS (últimas 2h)');
    console.log('============================================');
    const executions = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT status, COUNT(*) FROM flow_executions WHERE created_at > NOW() - INTERVAL '2 hours' GROUP BY status;"`);
    console.log(executions.stdout || executions.stderr);

    console.log('\n============================================');
    console.log('3. FLOW EXECUTIONS FALHADAS - detalhes');
    console.log('============================================');
    const failed = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT id, status, current_node_id, logs::text FROM flow_executions WHERE status='failed' ORDER BY created_at DESC LIMIT 2;"`);
    console.log(failed.stdout || failed.stderr);

    console.log('\n============================================');
    console.log('4. FLOW EXECUTIONS EM EXECUÇÃO - detalhes');
    console.log('============================================');
    const running = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT id, status, current_node_id FROM flow_executions WHERE status IN ('running','processing') ORDER BY created_at DESC LIMIT 5;"`);
    console.log(running.stdout || running.stderr);

    console.log('\n============================================');
    console.log('5. TESTE DIRETO NA EVOLUTION API (via Docker)');
    console.log('============================================');

    if (instName) {
        // Testar conexão state
        console.log(`\nTestando connectionState para "${instName}"...`);
        const state = await ssh.execCommand(`docker exec whatsaas-backend curl -s -m 10 "http://evolution:8080/instance/connectionState/${instName}" -H "apikey: ${apiKey}"`);
        console.log('Connection state:', state.stdout || state.stderr);

        // Teste de envio DIRETO
        console.log(`\n🔥 TESTE DE ENVIO DIRETO para 5567981108910...`);
        const sendDirect = await ssh.execCommand(`docker exec whatsaas-backend curl -s -m 15 -X POST "http://evolution:8080/message/sendText/${instName}" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"number":"5567981108910","text":"TESTE DIRETO DA EVOLUTION API - ${new Date().toISOString()}"}'`);
        console.log('Resultado:', sendDirect.stdout || sendDirect.stderr);
    } else {
        console.log('NENHUMA INSTÂNCIA CONECTADA ENCONTRADA!');
        
        console.log('\nTodas as instâncias:');
        const allInst = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT instance_name, status, provider FROM instances LIMIT 10;"`);
        console.log(allInst.stdout || allInst.stderr);
    }

    console.log('\n============================================');
    console.log('6. VERIFICAR EVOLUTION API - fetchInstances');
    console.log('============================================');
    const fetchInst = await ssh.execCommand(`docker exec whatsaas-backend curl -s -m 10 "http://evolution:8080/instance/fetchInstances" -H "apikey: ${apiKey}" | head -c 2000`);
    console.log(fetchInst.stdout || fetchInst.stderr);

    process.exit(0);
}

diagnose().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
