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
        const cmd = `docker logs whatsaas-backend | grep "DispatcherProcessor INSTANTIATED" | wc -l`;
        const res = await ssh.execCommand(cmd);
        console.log(res.stdout || res.stderr);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkLogs();
