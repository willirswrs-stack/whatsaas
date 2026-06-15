const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function upload() {
    try {
        await ssh.connect(config);
        console.log('Connected to VPS');
        await ssh.putFile(path.join(__dirname, '../docker-compose.prod.yml'), '/var/www/whatsaas/docker-compose.prod.yml');
        console.log('docker-compose.prod.yml uploaded successfully.');
        const result = await ssh.execCommand('cd /var/www/whatsaas && docker compose -f docker-compose.prod.yml up -d evolution-api');
        console.log('Evolution API restarted:', result.stdout || result.stderr);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

upload();
