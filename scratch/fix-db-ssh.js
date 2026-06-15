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
        const result = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d wathsaas -c "UPDATE subscription_plans SET max_instances = 1 WHERE name = 'Free' AND billing_cycle = 'monthly'; UPDATE subscription_plans SET max_instances = 3 WHERE name = 'Starter' AND billing_cycle = 'monthly'; UPDATE subscription_plans SET max_instances = 5 WHERE name = 'Pro' AND billing_cycle = 'monthly'; UPDATE subscription_plans SET max_instances = 20 WHERE name = 'Enterprise' AND billing_cycle = 'monthly';"`);
        console.log('=== STDOUT ===');
        console.log(result.stdout);
        console.log('=== STDERR ===');
        console.log(result.stderr);
        process.exit(0);
    } catch (err) {
        console.error('SSH Error:', err);
        process.exit(1);
    }
}

run();
