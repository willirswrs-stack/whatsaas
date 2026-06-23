const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function checkCampaign() {
    try {
        await ssh.connect(config);
        const cmd = `docker exec whatsaas-postgres psql -U postgres -d wathsaas -c "SELECT id, name, delay_min, delay_max FROM campaigns ORDER BY created_at DESC LIMIT 5"`;
        const res = await ssh.execCommand(cmd);
        console.log(res.stdout || res.stderr);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkCampaign();
