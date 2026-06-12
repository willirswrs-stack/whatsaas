const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function get400Errors() {
    try {
        await ssh.connect(config);
        console.log('🔌 Conectado via SSH!');

        const cmd = 'docker logs whatsaas-backend 2>&1 | grep \'"statusCode":400\' | tail -n 10';
        console.log(`Running: ${cmd}`);
        const res = await ssh.execCommand(cmd);
        console.log('--- 400 ERRORS ---');
        console.log(res.stdout || res.stderr);

        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
get400Errors();
