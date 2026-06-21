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
        console.log('🔌 Conectando ao servidor VPS (2.25.159.205)...');
        await ssh.connect(config);
        console.log('✅ Conectado com sucesso!');

        console.log('\n📝 Atualizando limite de upload do Nginx (client_max_body_size) para 100MB...');
        
        // Adiciona client_max_body_size 100M; ao bloco principal do Nginx
        const addLimitRes = await ssh.execCommand("sed -i '/http {/a \\    client_max_body_size 100M;' /etc/nginx/nginx.conf");
        console.log(addLimitRes.stdout || addLimitRes.stderr);

        console.log('\n🔍 Testando sintaxe da configuração do Nginx...');
        const testRes = await ssh.execCommand('nginx -t');
        console.log(testRes.stdout || testRes.stderr);
        
        if (testRes.code !== 0) {
            throw new Error('Erro na configuração do Nginx!');
        }

        console.log('\n🔄 Reiniciando serviço do Nginx...');
        await ssh.execCommand('systemctl restart nginx');
        console.log('✅ Nginx reiniciado com sucesso! O limite de upload agora é 100MB.');

        ssh.dispose();
    } catch (error) {
        console.error('❌ Erro:', error);
        ssh.dispose();
    }
}

fixNginx();
