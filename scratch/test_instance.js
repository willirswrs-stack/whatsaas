const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function test() {
    try {
        await ssh.connect(config);
        
        // Create instance
        const createResult = await ssh.execCommand('curl -s -X POST -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" -H "Content-Type: application/json" -d \'{"instanceName":"test-2897","qrcode":true,"integration":"WHATSAPP-BAILEYS"}\' http://localhost:8081/instance/create');
        console.log('Create:', createResult.stdout);
        
        // Wait 5 seconds
        await new Promise(r => setTimeout(r, 5000));
        
        // Connect instance
        const connectResult = await ssh.execCommand('curl -s -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" http://localhost:8081/instance/connect/test-2897');
        console.log('Connect:', connectResult.stdout);
        
        // Clean up
        await ssh.execCommand('curl -s -X DELETE -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" http://localhost:8081/instance/delete/test-2897');
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
