const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

const nginxConfigContent = `
server {
    listen 80;
    server_name whatsaas.online www.whatsaas.online app.whatsaas.online;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.whatsaas.online;

    location / {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name evolution.whatsaas.online;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

async function setup() {
    try {
        console.log('🔌 Conectando ao servidor VPS (2.25.159.205)...');
        await ssh.connect(config);
        console.log('✅ Conectado com sucesso!');

        console.log('\n⚙️ Instalando Nginx, Certbot e dependências na VPS...');
        const installRes = await ssh.execCommand('apt-get update && apt-get install nginx certbot python3-certbot-nginx -y');
        console.log(installRes.stdout || installRes.stderr);

        console.log('\n📝 Escrevendo arquivo de configuração do Nginx...');
        const tempPath = '/tmp/nginx_whatsaas.conf';
        // Escapar aspas simples para enviar via comando
        const escapedConfig = nginxConfigContent.replace(/'/g, "'\\''");
        await ssh.execCommand(`echo '${escapedConfig}' > ${tempPath}`);
        await ssh.execCommand(`mv ${tempPath} /etc/nginx/sites-available/whatsaas`);

        console.log('\n🔗 Habilitando configuração no Nginx e limpando padrão...');
        await ssh.execCommand('ln -sf /etc/nginx/sites-available/whatsaas /etc/nginx/sites-enabled/whatsaas');
        await ssh.execCommand('rm -f /etc/nginx/sites-enabled/default');

        console.log('\n🔍 Testando sintaxe da configuração do Nginx...');
        const testRes = await ssh.execCommand('nginx -t');
        console.log(testRes.stdout || testRes.stderr);
        if (testRes.code !== 0) {
            throw new Error('Configuração do Nginx inválida!');
        }

        console.log('\n🔄 Reiniciando serviço do Nginx...');
        await ssh.execCommand('systemctl restart nginx');
        console.log('Nginx reiniciado!');

        console.log('\n🔒 Solicitando e instalando certificados SSL automáticos via Certbot...');
        // Tentaremos emitir para todos os domínios
        const domains = '-d whatsaas.online -d www.whatsaas.online -d app.whatsaas.online -d api.whatsaas.online -d evolution.whatsaas.online';
        const certbotRes = await ssh.execCommand(`certbot --nginx ${domains} --non-interactive --agree-tos --email admin@whatsaas.online --redirect`);
        console.log(certbotRes.stdout || certbotRes.stderr);

        ssh.dispose();
        console.log('\n🎉 INSTALAÇÃO E SSL FINALIZADOS!');
    } catch (error) {
        console.error('❌ Erro no Setup:', error);
        ssh.dispose();
    }
}

setup();
