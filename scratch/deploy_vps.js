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
        console.log('Iniciando conexão SSH com a VPS...');
        await ssh.connect(config);
        console.log('Conectado à VPS com sucesso.');
        
        console.log('Fazendo git pull e build...');
        const command = 'cd /var/www/whatsaas && git add . && git stash && git fetch --all && git reset --hard origin/main && docker compose -f docker-compose.prod.yml up -d --build backend frontend';
        
        const result = await ssh.execCommand(command, {
            onStdout(chunk) {
                process.stdout.write(chunk.toString('utf8'));
            },
            onStderr(chunk) {
                process.stderr.write(chunk.toString('utf8'));
            }
        });
        
        console.log('\nDeploy finalizado com código:', result.code);
        process.exit(0);
    } catch (err) {
        console.error('\nErro no SSH:', err);
        process.exit(1);
    }
}

runDeploy();
