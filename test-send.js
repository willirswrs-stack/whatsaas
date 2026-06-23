const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function checkEvolution() {
    try {
        await ssh.connect(config);
        const instance = "loja-3169";
        const payload = JSON.stringify({
            number: "556293443169",
            text: "Teste de envio"
        });
        
        const cmd = `curl -s -X POST http://localhost:8081/message/sendText/${instance} \\
            -H "Content-Type: application/json" \\
            -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" \\
            -d '${payload}'`;
            
        const res = await ssh.execCommand(cmd);
        console.log(res.stdout || res.stderr);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkEvolution();
