const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function run() {
    const command = process.argv.slice(2).join(' ') || 'docker ps';
    console.log(`Running on VPS: ${command}`);
    try {
        await ssh.connect(config);
        const result = await ssh.execCommand(command);
        console.log('=== STDOUT ===');
        console.log(result.stdout);
        console.log('=== STDERR ===');
        console.log(result.stderr);
        process.exit(0);
    } catch (err) {
        console.error('SSH Error:', err);
        process.exit(1);
    }
}

run();
