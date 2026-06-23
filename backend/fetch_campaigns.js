const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
}).then(async () => {
    const res = await ssh.execCommand("docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c 'SELECT id, name, status, instance_id, instance_ids FROM campaigns ORDER BY created_at DESC LIMIT 5;'");
    console.log("Campaigns:", res.stdout || res.stderr);

    ssh.dispose();
});
