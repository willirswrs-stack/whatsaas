const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function checkLogs() {
    try {
        await ssh.connect(config);
        
        console.log('=== BACKEND LOGS ===');
        const res = await ssh.execCommand('docker logs whatsaas-backend --tail 500');
        console.log(res.stdout || res.stderr);

        ssh.dispose();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkLogs();
