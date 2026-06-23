const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testInstances() {
    await ssh.connect({
        host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000
    });

    const apiKey = '429683C4C977415CAAFCCE10F7D57E11';
    // Instâncias open: 3169, 35999963345, 63991022401
    // O usuário É o 3169 (556293443169), então vamos testar das OUTRAS instâncias para o número do usuário
    // Número do usuário: 556293443169

    const targetNumber = '556293443169'; // número do próprio usuário (o 3169)
    const testInstances = ['35999963345', '63991022401'];

    console.log(`\n=== TESTANDO ENVIO PARA O USUÁRIO (${targetNumber}) DE OUTRAS INSTÂNCIAS ===\n`);

    for (const inst of testInstances) {
        console.log(`--- Testando de "${inst}" ---`);
        
        // Verificar se o número existe
        const check = await ssh.execCommand(`curl -s -m 10 -X POST "http://localhost:8081/chat/whatsappNumbers/${inst}" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"numbers":["${targetNumber}"]}'`);
        console.log(`  whatsappNumbers check:`, check.stdout?.substring(0, 200));

        // Enviar mensagem
        const send = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8081/message/sendText/${inst}" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"number":"${targetNumber}","text":"TESTE DE ${inst} → VOCÊ: ${new Date().toLocaleTimeString()}"}'`);
        const result = send.stdout || '(sem resposta)';
        console.log(`  Resultado envio:`, result.substring(0, 300));
        
        // Verificar status da mensagem enviada
        try {
            const parsed = JSON.parse(result);
            const msgId = parsed?.key?.id;
            if (msgId) {
                await new Promise(r => setTimeout(r, 3000)); // aguardar 3s
                const status = await ssh.execCommand(`curl -s -m 10 -X POST "http://localhost:8081/chat/findMessages/${inst}" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"where":{"key":{"id":"${msgId}"}},"limit":1}'`);
                const statusData = JSON.parse(status.stdout || '{}');
                const msgUpdate = statusData?.messages?.records?.[0]?.MessageUpdate;
                console.log(`  Status após 3s:`, JSON.stringify(msgUpdate));
            }
        } catch(e) {}
        
        console.log('');
    }

    console.log('\n=== VERIFICAR SE O CHIP 3169 ESTÁ BANIDO ===');
    // Tentar verificar o próprio número dentro da instância
    const selfCheck = await ssh.execCommand(`curl -s -m 10 -X POST "http://localhost:8081/chat/whatsappNumbers/3169" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"numbers":["556293443169"]}'`);
    console.log('Auto-verificação 3169:', selfCheck.stdout);

    // Ver quantas mensagens foram enviadas hoje pela instância 3169
    const db = 'wathsaas';
    const sent = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -t -c "SELECT COUNT(*) FROM campaign_contacts cc JOIN instances i ON cc.instance_id = i.id WHERE i.instance_name='3169' AND cc.sent_at > NOW() - INTERVAL '24 hours';"`);
    console.log('\nMensagens enviadas pela 3169 nas últimas 24h (banco):', sent.stdout.trim());

    // Ver mensagens com ERROR
    const errors = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8081/chat/findMessages/3169" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"where":{"key":{"fromMe":true}},"limit":20}'`);
    try {
        const errData = JSON.parse(errors.stdout || '{}');
        const records = errData?.messages?.records || [];
        const errorCount = records.filter(r => r.MessageUpdate?.some(u => u.status === 'ERROR')).length;
        const pendingCount = records.filter(r => r.MessageUpdate?.some(u => u.status === 'PENDING') || r.MessageUpdate?.length === 0).length;
        const deliveredCount = records.filter(r => r.MessageUpdate?.some(u => ['DELIVERY_ACK','READ','PLAYED'].includes(u.status))).length;
        console.log(`\nDas últimas 20 mensagens da instância 3169:`);
        console.log(`  ERROR: ${errorCount}`);
        console.log(`  PENDING/sem update: ${pendingCount}`);
        console.log(`  DELIVERED/READ: ${deliveredCount}`);
    } catch(e) {
        console.log('Erro ao parsear:', e.message);
    }

    process.exit(0);
}

testInstances().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
