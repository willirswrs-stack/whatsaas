const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function runCommand(cmd, label) {
    console.log(`\n======================================================`);
    console.log(`[CLEAN] Running: ${label}`);
    console.log(`Command: ${cmd}`);
    console.log(`======================================================`);
    const res = await ssh.execCommand(cmd);
    console.log(res.stdout || res.stderr || '(No output)');
    return res.stdout || res.stderr;
}

async function main() {
    try {
        await ssh.connect(config);
        console.log('🔌 Conectado à VPS com sucesso para limpeza segura!');

        // 1. Check disk space before
        console.log('\n--- ESPAÇO DE DISCO ANTES DA LIMPEZA ---');
        await runCommand('df -h /', 'Espaço de disco na partição raiz (/)');
        await runCommand('docker system df', 'Uso de espaço do Docker');

        // 2. Safe Builder Prune (deletes build cache, totally safe)
        console.log('\n--- EXECUTANDO LIMPEZA DE BUILD CACHE DO DOCKER ---');
        await runCommand('docker builder prune -af', 'Limpeza do Cache de Build');

        // 3. Safe Image Prune (deletes unused images, keeps images in use by running containers)
        console.log('\n--- EXECUTANDO LIMPEZA DE IMAGENS DOCKER NÃO UTILIZADAS ---');
        await runCommand('docker image prune -af', 'Limpeza de Imagens Inativas');

        // 4. Safe Container Prune (deletes stopped/dead containers)
        console.log('\n--- EXECUTANDO LIMPEZA DE CONTAINERS INATIVOS ---');
        await runCommand('docker container prune -f', 'Limpeza de Containers Parados');

        // 5. Check disk space after
        console.log('\n--- ESPAÇO DE DISCO DEPOIS DA LIMPEZA ---');
        await runCommand('df -h /', 'Espaço de disco pós-limpeza na partição raiz (/)');
        await runCommand('docker system df', 'Uso de espaço do Docker pós-limpeza');

        ssh.dispose();
        console.log('\n✅ Limpeza segura concluída com sucesso!');
    } catch (e) {
        console.error('Erro na limpeza:', e);
        try { ssh.dispose(); } catch (_) {}
    }
}

main();
