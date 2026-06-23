const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
}).then(async () => {
    const res = await ssh.execCommand('docker logs --tail 2000 whatsaas-backend | grep -i "instance does not exist"');
    console.log(res.stdout || res.stderr);
    ssh.dispose();
});
