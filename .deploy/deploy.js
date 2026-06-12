const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');
const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();
const rootDir = path.join(__dirname, '..');
const zipPath = path.join(__dirname, 'whatsaas.zip');

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function zipProject() {
    console.log('📦 Compactando projeto...');
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`✅ Projeto compactado: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
            resolve();
        });
        archive.on('error', err => reject(err));

        archive.pipe(output);

        archive.glob('**/*', {
            cwd: rootDir,
            ignore: [
                '**/node_modules/**', 
                'PhotoCleanAI/**',
                'backups/**',
                '**/uploads/**',
                '.git/**', 
                '.deploy/**', 
                'frontend/.next/**', 
                'backend/dist/**',
                '**/*.zip',
                '**/*.log',
                'backend/*.txt'
            ],
            dot: true
        });

        archive.finalize();
    });
}

async function deploy() {
    try {
        await zipProject();

        console.log('🔌 Conectando ao servidor VPS (2.25.159.205)...');
        await ssh.connect(config);
        console.log('✅ Conectado com sucesso!');

        console.log('⚙️ Instalando dependências no servidor (Docker, Unzip)...');
        await ssh.execCommand('apt-get update && apt-get install unzip docker.io docker-compose -y');
        
        await ssh.execCommand('systemctl enable docker && systemctl start docker');

        console.log('📂 Criando diretório e enviando código compactado...');
        await ssh.execCommand('mkdir -p /var/www/whatsaas');
        
        await ssh.putFile(zipPath, '/var/www/whatsaas/whatsaas.zip');
        console.log('✅ Upload concluído!');

        console.log('📦 Extraindo arquivos no servidor...');
        await ssh.execCommand('cd /var/www/whatsaas && unzip -o whatsaas.zip && rm whatsaas.zip');

        console.log('🚀 Iniciando os containers Docker (Construindo API e Painel)...');
        const dockerRes = await ssh.execCommand('cd /var/www/whatsaas && docker compose -f docker-compose.prod.yml up -d --build');
        
        console.log('=== LOGS DO DOCKER ===');
        console.log(dockerRes.stdout || dockerRes.stderr);

        console.log('🎉 DEPLOY CONCLUÍDO COM SUCESSO! O WhatSaas está online e blindado na sua Hostinger.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro Fatal no Deploy:', error);
        process.exit(1);
    }
}

deploy();
