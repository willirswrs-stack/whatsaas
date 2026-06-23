const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
}).then(async () => {
    const res = await ssh.execCommand("docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c 'SELECT id, host, port, username, password FROM proxies LIMIT 20;'");
    console.log("Proxies table:", res.stdout || res.stderr);

    ssh.dispose();
});
