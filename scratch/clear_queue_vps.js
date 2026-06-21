const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function run() {
    try {
        console.log('Conectando à VPS para limpar a fila do BullMQ (WARMUP_QUEUE)...');
        await ssh.connect(config);
        
        // 1. Flush Redis DB 0 (onde ficam as filas do BullMQ do backend, Evolution usa DB 1 e 2)
        // Lendo senha do .env
        const command = `cd /var/www/whatsaas && export $(cat .env | grep REDIS_PASSWORD) && docker exec whatsaas-redis redis-cli -a $REDIS_PASSWORD -n 0 FLUSHDB && docker restart whatsaas-backend`;
        
        console.log('Executando:', command);
        const result = await ssh.execCommand(command);
        
        console.log('STDOUT:', result.stdout);
        if (result.stderr) console.error('STDERR:', result.stderr);
        
        console.log('Fila limpa com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('Erro:', err);
        process.exit(1);
    }
}

run();
