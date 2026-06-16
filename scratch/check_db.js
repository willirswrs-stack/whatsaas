const { execSync } = require('child_process');

try {
    const cmd = `node scratch/run_ssh_command.js "docker exec whatsaas-postgres psql -U postgres -d wathsaas -c 'SELECT id, instance_name, phone, is_system_seed, status, tenant_id FROM instances;'"`;
    console.log(execSync(cmd).toString());
} catch (e) {
    console.error(e.toString());
}
