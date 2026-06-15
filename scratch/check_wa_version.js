const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function getVersion() {
    try {
        await ssh.connect(config);
        const result = await ssh.execCommand('curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" "https://web.whatsapp.com/check-update?version=0&platform=web"');
        console.log(result.stdout || result.stderr);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getVersion();
