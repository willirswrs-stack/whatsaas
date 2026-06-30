const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function completeCampaigns() {
    try {
        await ssh.connect(config);
        
        console.log('=== FIXING STUCK CAMPAIGNS IN DB ===');
        
        // Let's first check how many campaigns are stuck
        const checkRes = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d wathsaas -c "
            SELECT id, name, status, total_contacts, (sent_count + failed_count) as processed 
            FROM campaigns 
            WHERE status = 'running' AND (sent_count + failed_count) >= total_contacts AND total_contacts > 0"`);
        console.log('Stuck campaigns found:', checkRes.stdout || checkRes.stderr);

        // Run the update
        const updateRes = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d wathsaas -c "
            UPDATE campaigns 
            SET status = 'completed', completed_at = NOW() 
            WHERE status = 'running' AND (sent_count + failed_count) >= total_contacts AND total_contacts > 0"`);
        console.log('Update result:', updateRes.stdout || updateRes.stderr);

        ssh.dispose();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
completeCampaigns();
