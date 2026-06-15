const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function run() {
    try {
        await ssh.connect(config);
        const query = `
        SELECT w.id, w.instance_id, w.status, w.target_messages, w.sent_count, w.scheduled_at, w.completed_at
        FROM warmup_schedules w
        JOIN instances i ON w.instance_id = i.id
        WHERE i.tenant_id = '308e9361-198d-4eda-b2ee-166f2611264b'
        ORDER BY w.scheduled_at DESC LIMIT 20;
        `;
        const res = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d wathsaas -x -c "${query.replace(/\n/g, ' ')}"`);
        console.log('--- WARMUP SCHEDULES ---');
        console.log(res.stdout);
        if (res.stderr) console.log('ERR:', res.stderr);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
