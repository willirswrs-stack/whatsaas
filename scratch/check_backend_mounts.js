const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function checkMounts() {
    try {
        await ssh.connect(config);
        
        console.log('=== BACKEND MOUNTS ===');
        const res = await ssh.execCommand('docker inspect whatsaas-backend --format "{{json .Mounts}}"');
        console.log(res.stdout);
        
        console.log('=== HOST UPLOADS DIRECTORY CONTENTS ===');
        const resHost = await ssh.execCommand('ls -l /var/www/uploads/ 2>&1');
        console.log(resHost.stdout);

        console.log('=== BACKEND INTERNAL UPLOADS CONTENTS ===');
        const resBackend = await ssh.execCommand('docker exec whatsaas-backend ls -l /app/uploads/ 2>&1 || docker exec whatsaas-backend ls -l /home/appuser/uploads/ 2>&1');
        console.log(resBackend.stdout);

        ssh.dispose();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkMounts();
