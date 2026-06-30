const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function checkEnv() {
    try {
        await ssh.connect(config);
        const res = await ssh.execCommand('docker exec whatsaas-backend env');
        console.log(res.stdout);
        ssh.dispose();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkEnv();
