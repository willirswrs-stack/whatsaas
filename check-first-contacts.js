const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function checkTimestamps() {
    try {
        await ssh.connect(config);
        const cmd = `docker exec whatsaas-postgres psql -U postgres -d wathsaas -c "
            SELECT cc.id, cc.status, cc.sent_at, cc.timing_metadata
            FROM campaign_contacts cc
            JOIN campaigns c ON c.id = cc.campaign_id
            WHERE c.name = 'Troca de número – Batch 1/4'
            ORDER BY cc.created_at ASC
            LIMIT 5"`;
        const res = await ssh.execCommand(cmd);
        console.log(res.stdout || res.stderr);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkTimestamps();
