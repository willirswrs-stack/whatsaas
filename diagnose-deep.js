const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function deepTest() {
    await ssh.connect({
        host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000
    });

    const apiKey = '429683C4C977415CAAFCCE10F7D57E11';

    console.log('=== 1. VERIFICAR SE 5567981108910 EXISTE NO WHATSAPP ===');
    // Verificar usando whatsappNumbers com o número correto
    const check = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8081/chat/whatsappNumbers/3169" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"numbers":["5567981108910"]}'`);
    console.log('Resultado:', check.stdout || check.stderr || '(sem resposta)');

    console.log('\n=== 2. VERIFICAR SEM O 9 ===');
    const check2 = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8081/chat/whatsappNumbers/3169" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"numbers":["556781108910"]}'`);
    console.log('Resultado:', check2.stdout || check2.stderr || '(sem resposta)');

    console.log('\n=== 3. ENVIAR COM O NÚMERO EXATO (com 9) ===');
    const send1 = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8081/message/sendText/3169" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"number":"5567981108910","text":"TESTE COM 9: ${new Date().toLocaleTimeString()}"}'`);
    console.log('Resposta (com 9):', send1.stdout || '(sem resposta)');

    console.log('\n=== 4. STATUS REAL DA INSTÂNCIA 3169 ===');
    const state = await ssh.execCommand(`curl -s -m 10 "http://localhost:8081/instance/connectionState/3169" -H "apikey: ${apiKey}"`);
    console.log('State:', state.stdout);

    console.log('\n=== 5. VERIFICAR MENSAGENS ENVIADAS PELA INSTÂNCIA 3169 ===');
    const msgs = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8081/chat/findMessages/3169" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"where":{"key":{"fromMe":true}},"limit":5}' | head -c 3000`);
    console.log('Últimas mensagens enviadas:', msgs.stdout || '(sem resposta)');

    console.log('\n=== 6. VERIFICAR SE A INSTÂNCIA ESTÁ REALMENTE ONLINE ===');
    const profile = await ssh.execCommand(`curl -s -m 10 "http://localhost:8081/instance/fetchInstances" -H "apikey: ${apiKey}" | python3 -c "import sys,json; data=json.load(sys.stdin); inst=[i for i in data if i['name']=='3169']; print(json.dumps(inst[0] if inst else {}, indent=2))"`)
    console.log('Perfil 3169:', profile.stdout || profile.stderr);

    process.exit(0);
}

deepTest().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
