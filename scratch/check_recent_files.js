const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = path.join(dir, file);
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.next') continue;
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files);
        } else {
            files.push(name);
        }
    }
    return files;
}

const allFiles = getFiles('c:\\Users\\Usuario\\whatsaas');
const fileStats = allFiles.map(f => {
    try {
        const stat = fs.statSync(f);
        return { name: f, mtime: stat.mtime };
    } catch (e) {
        return null;
    }
}).filter(Boolean);

fileStats.sort((a, b) => b.mtime - a.mtime);

console.log('=== 20 MOST RECENTLY MODIFIED FILES ===');
fileStats.slice(0, 20).forEach(f => {
    console.log(`${f.mtime.toISOString()} - ${f.name}`);
});
process.exit(0);
