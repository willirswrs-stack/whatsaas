const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function diagnose() {
    await ssh.connect({
        host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000
    });

    const db = 'wathsaas';
    const apiKey = '429683C4C977415CAAFCCE10F7D57E11';

    // Descobrir colunas da tabela
    console.log('\n============================================');
    console.log('1. COLUNAS DA TABELA flow_executions');
    console.log('============================================');
    const cols = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT column_name FROM information_schema.columns WHERE table_name='flow_executions' ORDER BY ordinal_position;"`);
    console.log(cols.stdout);

    console.log('\n============================================');
    console.log('2. FLOW EXECUTIONS STATUS (últimas 2h)');
    console.log('============================================');
    const executions = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT status, COUNT(*) FROM flow_executions WHERE \\"createdAt\\" > NOW() - INTERVAL '2 hours' GROUP BY status;"`);
    console.log(executions.stdout || executions.stderr);

    console.log('\n============================================');
    console.log('3. FLOW EXECUTIONS FALHADAS (logs de erro)');
    console.log('============================================');
    const failed = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT id, status, \\"currentNodeId\\", logs FROM flow_executions WHERE status='failed' ORDER BY \\"createdAt\\" DESC LIMIT 2;"`);
    console.log(failed.stdout || failed.stderr);

    console.log('\n============================================');
    console.log('4. TESTE EVOLUTION API - direto do host');
    console.log('============================================');

    // Evolution na porta mapeada do host
    const state = await ssh.execCommand(`curl -s -m 10 "http://localhost:8080/instance/fetchInstances" -H "apikey: ${apiKey}" | python3 -c "import sys,json; data=json.load(sys.stdin); [print(inst.get('name','?'), '-', inst.get('connectionStatus','?')) for inst in data[:10]]" 2>&1 || curl -s -m 10 "http://localhost:8080/instance/fetchInstances" -H "apikey: ${apiKey}" | head -c 2000`);
    console.log('Instâncias na Evolution:', state.stdout || state.stderr);

    console.log('\n============================================');
    console.log('5. TESTE DE ENVIO DIRETO via host');
    console.log('============================================');
    const sendTest = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8080/message/sendText/loja-3169" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"number":"5567981108910","text":"TESTE DIAGNOSTICO ${new Date().toISOString()}"}'`);
    console.log('Resultado envio direto loja-3169:', sendTest.stdout || sendTest.stderr);

    // Instância com nome "3"
    const sendTest2 = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8080/message/sendText/3" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"number":"5567981108910","text":"TESTE DIAGNOSTICO 2 ${new Date().toISOString()}"}'`);
    console.log('Resultado envio direto "3":', sendTest2.stdout || sendTest2.stderr);

    console.log('\n============================================');
    console.log('6. VERIFICAR porta da Evolution API');
    console.log('============================================');
    const ports = await ssh.execCommand('docker ps --format "{{.Names}}: {{.Ports}}" | grep -i evolution');
    console.log(ports.stdout || ports.stderr);

    process.exit(0);
}

diagnose().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
