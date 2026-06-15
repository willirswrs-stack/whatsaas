const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function readCompose() {
    try {
        await ssh.connect(config);
        console.log('🔌 Conectado via SSH!');

        console.log('\n--- docker-compose.prod.yml at /var/www/whatsaas ---');
        const composeRes = await ssh.execCommand('cat /var/www/whatsaas/docker-compose.prod.yml');
        console.log(composeRes.stdout || composeRes.stderr);

        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
readCompose();
