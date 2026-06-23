const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

const numbersToCheck = [
    "556283194424",
    "5562983194424",
    "5511999999999"
];

async function checkEvolution() {
    try {
        await ssh.connect(config);
        
        // Need to pick one active instance, e.g. "loja-3169"
        const instance = "loja-3169";
        
        const payload = JSON.stringify({ numbers: numbersToCheck });
        
        const cmd = `curl -s -X POST http://localhost:8081/chat/whatsappNumbers/${instance} \\
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
