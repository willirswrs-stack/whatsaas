const { execSync } = require('child_process');
try {
  const output = execSync('sshpass -p "981952897Wr@" ssh -o StrictHostKeyChecking=no root@2.25.159.205 "cd /var/www/whatsaas && docker compose logs --tail=1000 backend"');
  const lines = output.toString().split('\n');
  const filtered = lines.filter(line => line.toLowerCase().includes('mock') || line.toLowerCase().includes('warmup') || line.toLowerCase().includes('groq') || line.toLowerCase().includes('ai error'));
  console.log(filtered.join('\n'));
} catch (e) {
  console.error(e.message);
}
