const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function diagnose() {
    await ssh.connect({
        host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000
    });

    console.log('\n============================================');
    console.log('1. BANCO DE DADOS - NOME DO DB CORRETO');
    console.log('============================================');
    const dbs = await ssh.execCommand('docker exec whatsaas-postgres psql -U postgres -l 2>&1 | head -20');
    console.log(dbs.stdout || dbs.stderr);

    // Tentar descobrir o nome do banco
    const dbName = await ssh.execCommand("docker exec whatsaas-postgres psql -U postgres -t -c \"SELECT datname FROM pg_database WHERE datname NOT IN ('postgres','template0','template1');\" 2>&1");
    console.log('Bancos encontrados:', dbName.stdout);

    const realDb = dbName.stdout.trim().split('\n')[0].trim();
    console.log('Usando banco:', realDb);

    console.log('\n============================================');
    console.log('2. INSTÂNCIAS NO BANCO');
    console.log('============================================');
    const instances = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${realDb} -c "SELECT \\"instanceName\\", status, provider FROM instances WHERE status='connected' LIMIT 5;"`);
    console.log(instances.stdout || instances.stderr);

    console.log('\n============================================');
    console.log('3. FLOW EXECUTIONS - O que está acontecendo?');
    console.log('============================================');
    const executions = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${realDb} -c "SELECT status, COUNT(*) FROM flow_executions WHERE \\"createdAt\\" > NOW() - INTERVAL '2 hours' GROUP BY status;"`);
    console.log(executions.stdout || executions.stderr);

    console.log('\n============================================');
    console.log('4. ÚLTIMAS FLOW EXECUTIONS - logs de erros');
    console.log('============================================');
    const execLogs = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${realDb} -c "SELECT id, status, \\"currentNodeId\\", logs FROM flow_executions WHERE status='failed' ORDER BY \\"createdAt\\" DESC LIMIT 3;"`);
    console.log(execLogs.stdout || execLogs.stderr);

    console.log('\n============================================');
    console.log('5. TESTE EVOLUTION API - fetchInstances');
    console.log('============================================');
    // Pegar apikey da env do backend
    const envCheck = await ssh.execCommand('docker inspect whatsaas-backend | python3 -c "import sys,json; env=[e for c in json.load(sys.stdin) for e in c[\'Config\'][\'Env\'] if \'EVOLUTION\' in e]; print(\'\\n\'.join(env))"');
    console.log('Evolution env vars:', envCheck.stdout || envCheck.stderr);

    const apiKey = await ssh.execCommand('docker inspect whatsaas-backend 2>/dev/null | python3 -c "import sys,json; env={e.split(\'=\')[0]:e.split(\'=\',1)[1] for c in json.load(sys.stdin) for e in c[\'Config\'][\'Env\']}; print(env.get(\'EVOLUTION_API_KEY\',\'NOT FOUND\'))"');
    console.log('API KEY:', apiKey.stdout.trim());

    const evolutionUrl = await ssh.execCommand('docker inspect whatsaas-backend 2>/dev/null | python3 -c "import sys,json; env={e.split(\'=\')[0]:e.split(\'=\',1)[1] for c in json.load(sys.stdin) for e in c[\'Config\'][\'Env\']}; print(env.get(\'EVOLUTION_API_URL\',\'NOT FOUND\'))"');
    console.log('EVOLUTION URL:', evolutionUrl.stdout.trim());

    const apiKeyVal = apiKey.stdout.trim();
    const apiUrlVal = evolutionUrl.stdout.trim();

    if (apiKeyVal !== 'NOT FOUND' && apiUrlVal !== 'NOT FOUND') {
        console.log('\n🔥 Testando fetch de instâncias via Evolution API...');
        const test = await ssh.execCommand(`curl -s -m 10 "${apiUrlVal}/instance/fetchInstances" -H "apikey: ${apiKeyVal}" | head -c 1000`);
        console.log(test.stdout || test.stderr);

        // Pegar nome da instância conectada
        const instName = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${realDb} -t -c "SELECT \\"instanceName\\" FROM instances WHERE status='connected' LIMIT 1;"`);
        const inst = instName.stdout.trim();
        
        if (inst) {
            console.log(`\n🔥 Testando connectionState para instância "${inst}"...`);
            const connState = await ssh.execCommand(`curl -s -m 10 "${apiUrlVal}/instance/connectionState/${inst}" -H "apikey: ${apiKeyVal}"`);
            console.log(connState.stdout || connState.stderr);

            console.log(`\n🔥 Tentando ENVIAR mensagem de teste para 5567981108910...`);
            const sendTest = await ssh.execCommand(`curl -s -m 15 -X POST "${apiUrlVal}/message/sendText/${inst}" -H "apikey: ${apiKeyVal}" -H "Content-Type: application/json" -d '{"number":"5567981108910","text":"TESTE DIAGNÓSTICO - ${new Date().toISOString()}"}'`);
            console.log('Resultado do envio:', sendTest.stdout || sendTest.stderr);
        }
    }

    process.exit(0);
}

diagnose().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
