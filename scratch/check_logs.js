const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@' });
    const res = await ssh.execCommand('tail -n 50 /var/log/nginx/access.log && echo "---ERRORS---" && tail -n 50 /var/log/nginx/error.log');
    console.log(res.stdout || res.stderr);
    
    console.log('\n--- BACKEND LOGS ---');
    const logs = await ssh.execCommand('docker logs whatsaas-backend --tail 50');
    console.log(logs.stdout || logs.stderr);
    
    process.exit(0);
}
check();
