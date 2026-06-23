const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testAndFix() {
    await ssh.connect({
        host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000
    });

    const apiKey = '429683C4C977415CAAFCCE10F7D57E11';
    const db = 'wathsaas';

    console.log('=== TESTE: 3169 ENVIANDO PARA 35999963345 ===');
    const send = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8081/message/sendText/3169" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"number":"553599963345","text":"TESTE SAÍDA DE 3169: ${new Date().toLocaleTimeString()}"}'`);
    console.log('Resultado:', send.stdout);

    // aguardar 5s para pegar status
    await new Promise(r => setTimeout(r, 5000));

    try {
        const parsed = JSON.parse(send.stdout);
        const msgId = parsed?.key?.id;
        if (msgId) {
            const status = await ssh.execCommand(`curl -s -m 10 -X POST "http://localhost:8081/chat/findMessages/3169" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"where":{"key":{"id":"${msgId}"}},"limit":1}'`);
            const statusData = JSON.parse(status.stdout || '{}');
            const update = statusData?.messages?.records?.[0]?.MessageUpdate;
            console.log('Status após 5s:', JSON.stringify(update));
        }
    } catch(e) {}

    console.log('\n=== QUAL INSTÂNCIA A CAMPANHA ESTÁ USANDO ===');
    const campInst = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT c.name, c.status, c.settings FROM campaigns WHERE status='running' LIMIT 3;"`);
    console.log(campInst.stdout);

    console.log('\n=== INSTÂNCIAS DISPONÍVEIS QUE FUNCIONAM ===');
    // 35999963345 e 63991022401 funcionam
    // Pegar os IDs delas no banco
    const workingInst = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT id, instance_name, status FROM instances WHERE instance_name IN ('35999963345','63991022401');"`);
    console.log(workingInst.stdout);

    process.exit(0);
}

testAndFix().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
