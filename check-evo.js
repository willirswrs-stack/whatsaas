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
        const cmd = `curl -s -X GET http://localhost:8081/instance/fetchInstances -H "apikey: 429683C4C977415CAAFCCE10F7D57E11"`;
        const res = await ssh.execCommand(cmd);
        console.log(res.stdout || res.stderr);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkEvolution();
