const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function readScripts() {
    try {
        await ssh.connect(config);
        console.log('🔌 Conectado via SSH!');

        console.log('\n--- deploy.sh ---');
        const shRes = await ssh.execCommand('cat /var/www/whatsaas/scripts/deploy.sh');
        console.log(shRes.stdout || shRes.stderr);

        console.log('\n--- deploy.js ---');
        const jsRes = await ssh.execCommand('cat /var/www/whatsaas/.deploy/deploy.js');
        console.log(jsRes.stdout || jsRes.stderr);

        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
readScripts();
