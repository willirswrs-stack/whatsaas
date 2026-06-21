const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function deploy() {
    try {
        await ssh.connect(config);
        console.log('Conectado via SSH!');

        console.log('\n--- ATUALIZANDO CODIGO ---');
        let res = await ssh.execCommand('cd /var/www/whatsaas && git pull origin main');
        console.log(res.stdout || res.stderr);

        console.log('\n--- REBUILDANDO E REINICIANDO ---');
        res = await ssh.execCommand('cd /var/www/whatsaas && docker compose -f docker-compose.prod.yml build frontend backend && docker compose -f docker-compose.prod.yml up -d');
        console.log(res.stdout || res.stderr);

        ssh.dispose();
        console.log('Deploy finalizado!');
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
deploy();
