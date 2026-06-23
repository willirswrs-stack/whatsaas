const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function checkCampaignInstances() {
    try {
        await ssh.connect(config);
        const cmd = `docker exec whatsaas-postgres psql -U postgres -d wathsaas -c "
            SELECT c.name as campaign_name, c.id as campaign_id, COUNT(DISTINCT cc.instance_id) as instance_count, COUNT(cc.id) as total_contacts 
            FROM campaigns c 
            JOIN campaign_contacts cc ON c.id = cc.campaign_id 
            GROUP BY c.id, c.name 
            ORDER BY c.created_at DESC LIMIT 5"`;
        const res = await ssh.execCommand(cmd);
        console.log(res.stdout || res.stderr);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkCampaignInstances();
