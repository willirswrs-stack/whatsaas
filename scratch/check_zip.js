const fs = require('fs');
const path = require('path');
const yauzl = require('yauzl'); // yauzl is usually present, or we can use another module, wait, yauzl might not be installed.
// Let's use adm-zip if installed, or just use child_process to run unzip or tar or just use a standard script.
// Wait! Windows has tar.exe which can list zip files!
// Let's run a child_process command to run tar -tf .deploy/whatsaas.zip using Node.

const { execSync } = require('child_process');
try {
    const zipPath = path.join(__dirname, '..', '..', '..', '..', '..', 'whatsaas', '.deploy', 'whatsaas.zip');
    console.log('Verificando zip em:', zipPath);
    const output = execSync(`tar -tf "${zipPath}"`).toString();
    const files = output.split('\n').map(f => f.trim()).filter(Boolean);
    console.log(`O zip contém ${files.length} arquivos.`);
    const dockerfiles = files.filter(f => f.includes('Dockerfile'));
    console.log('Dockerfiles no zip:', dockerfiles);
} catch (e) {
    console.error('Erro:', e.message);
}
