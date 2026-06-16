const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function runDeploy() {
    try {
        await ssh.connect(config);
        const command = 'cd /var/www/whatsaas && docker compose -f docker-compose.prod.yml logs --tail=5000 backend | grep -i "AI Error in Warmup"';
        const result = await ssh.execCommand(command);
        console.log(result.stdout);
        if(result.stderr) console.error(result.stderr);
        process.exit(0);
    } catch (err) {
        console.error('\nErro no SSH:', err);
        process.exit(1);
    }
}

runDeploy();
