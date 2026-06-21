const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function fixNginx() {
    try {
        console.log('Conectando ao VPS...');
        await ssh.connect(config);
        
        // Add client_max_body_size 100M; inside all server blocks
        const res = await ssh.execCommand("sed -i '/server_name/a \\    client_max_body_size 100M;' /etc/nginx/sites-available/whatsaas");
        console.log(res.stdout || res.stderr);

        console.log('Testando nginx...');
        const testRes = await ssh.execCommand('nginx -t');
        console.log(testRes.stdout || testRes.stderr);

        if (testRes.code === 0) {
            console.log('Reiniciando nginx...');
            await ssh.execCommand('systemctl restart nginx');
            console.log('Feito!');
        } else {
            console.error('Erro de sintaxe no Nginx, não vou reiniciar.');
        }

        ssh.dispose();
    } catch (e) {
        console.error(e);
        ssh.dispose();
    }
}
fixNginx();
