const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
}).then(async () => {
    const res = await ssh.execCommand("docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c 'SELECT id, instance_name, status, daily_sent, daily_limit, warmup_day, warmup_enabled FROM instances WHERE id = '\\''26f4c146-7f3c-429a-97c2-bfc96db452cf'\\'';'");
    console.log("Instance:", res.stdout || res.stderr);

    ssh.dispose();
});
