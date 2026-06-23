const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function diagnose() {
    await ssh.connect({
        host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000
    });

    const db = 'wathsaas';
    const apiKey = '429683C4C977415CAAFCCE10F7D57E11';
    const evoUrl = 'http://localhost:8081'; // porta correta externamente

    console.log('\n=== INSTÂNCIAS NO BANCO DE DADOS ===');
    const dbInst = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT instance_name, status, provider FROM instances ORDER BY status LIMIT 15;"`);
    console.log(dbInst.stdout);

    console.log('\n=== INSTÂNCIAS NA EVOLUTION API ===');
    const evoInst = await ssh.execCommand(`curl -s -m 10 "http://localhost:8081/instance/fetchInstances" -H "apikey: ${apiKey}"`);
    const raw = evoInst.stdout || '[]';
    console.log('RAW (primeiros 3000 chars):', raw.substring(0, 3000));

    // Parsear e mostrar nomes
    try {
        const data = JSON.parse(raw);
        console.log('\nInstâncias na Evolution:');
        if (Array.isArray(data)) {
            data.forEach(i => console.log(`  - ${i.name || i.instanceName}: ${i.connectionStatus || i.state}`));
        } else {
            console.log('Formato inesperado:', JSON.stringify(data).substring(0, 500));
        }
    } catch(e) {
        console.log('Erro ao parsear JSON:', e.message);
    }

    console.log('\n=== TESTAR INSTÂNCIA "loja-3169" NA EVOLUTION ===');
    const state3169 = await ssh.execCommand(`curl -s -m 10 "http://localhost:8081/instance/connectionState/loja-3169" -H "apikey: ${apiKey}"`);
    console.log('loja-3169 state:', state3169.stdout || state3169.stderr || '(sem resposta)');

    console.log('\n=== ENVIO DIRETO (porta 8081, instância correta) ===');
    // Pegar primeiro nome da evolution
    const evoRaw2 = await ssh.execCommand(`curl -s -m 10 "http://localhost:8081/instance/fetchInstances" -H "apikey: ${apiKey}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0].get('name','') if d else '')" 2>&1`);
    const firstInst = evoRaw2.stdout.trim();
    console.log('Primeiro instanceName na Evolution:', firstInst);

    if (firstInst && !firstInst.includes('Error') && !firstInst.includes('Traceback')) {
        console.log(`\nEnviando DIRETO para ${firstInst}...`);
        const sendDirect = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8081/message/sendText/${firstInst}" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"number":"5567981108910","text":"TESTE DIRETO 100% ${new Date().toLocaleTimeString()}"}'`);
        console.log('Resultado:', sendDirect.stdout || '(sem resposta)');
    }

    console.log('\n=== LOGS DO BACKEND (últimos erros relacionados ao envio) ===');
    const backendLogs = await ssh.execCommand("docker logs whatsaas-backend --tail 300 2>&1 | grep -E '(Error|error|Failed|failed|sendText|Number|not found|evolution|Evolution)' | tail -40");
    console.log(backendLogs.stdout || '(sem logs de erro)');

    process.exit(0);
}

diagnose().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
