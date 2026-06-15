const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function checkTags() {
    try {
        await ssh.connect(config);
        const result = await ssh.execCommand('curl -s "https://hub.docker.com/v2/repositories/atendai/evolution-api/tags/?page_size=20" | grep -o \'"name":"[^"]*"\'');
        console.log(result.stdout || result.stderr);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTags();
