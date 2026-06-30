const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function checkNginx() {
    try {
        await ssh.connect(config);
        
        console.log('=== NGINX CONFIGS ON VPS ===');
        const res = await ssh.execCommand('ls -l /etc/nginx/sites-enabled/ 2>&1');
        console.log(res.stdout);

        const resCat = await ssh.execCommand('cat /etc/nginx/sites-enabled/* 2>&1');
        console.log(resCat.stdout);

        ssh.dispose();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkNginx();
