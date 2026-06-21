const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const config = { host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 60000 };
async function checkLogs() {
  await ssh.connect(config);
  const res = await ssh.execCommand('echo "dummy content" > test.pdf && curl -s -X POST http://127.0.0.1:3333/api/v1/uploads/media -F "file=@test.pdf"');
  console.log(res.stdout || res.stderr);
  ssh.dispose();
}
checkLogs();
