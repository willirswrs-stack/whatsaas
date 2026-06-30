const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function checkDb() {
    try {
        await ssh.connect(config);
        
        console.log('=== CAMPAIGNS ===');
        const resCampaigns = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d wathsaas -c "
            SELECT id, name, status, total_contacts, sent_count, failed_count, flow_id 
            FROM campaigns 
            ORDER BY created_at DESC LIMIT 10"`);
        console.log(resCampaigns.stdout || resCampaigns.stderr);

        console.log('=== CONTACTS BY STATUS ===');
        const resContacts = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d wathsaas -c "
            SELECT campaign_id, status, count(*), error_message
            FROM campaign_contacts 
            GROUP BY campaign_id, status, error_message
            ORDER BY campaign_id"`);
        console.log(resContacts.stdout || resContacts.stderr);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkDb();
