const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function checkFlows() {
    try {
        await ssh.connect(config);
        
        console.log('=== ACTIVE FLOWS AND MEDIA NODES ===');
        const res = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d wathsaas -c "
            SELECT id, name, status, nodes 
            FROM flows 
            WHERE status = 'active'"`);
        
        console.log(res.stdout || res.stderr);

        // Parse nodes to see if there are any media URLs
        // We will do it in javascript by fetching the raw json
        const resJson = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d wathsaas -t -c "
            SELECT json_build_object('id', id, 'name', name, 'nodes', nodes) 
            FROM flows 
            WHERE status = 'active'"`);
        
        const lines = resJson.stdout.trim().split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const flow = JSON.parse(line);
                console.log(`Flow: ${flow.name} (${flow.id})`);
                if (Array.isArray(flow.nodes)) {
                    flow.nodes.forEach(node => {
                        const type = node.data?.type || node.type;
                        if (['image', 'video', 'audio', 'document', 'media'].includes(type)) {
                            console.log(`  Media Node: ${node.id} (${type})`);
                            console.log(`    Config:`, JSON.stringify(node.data?.config || node.config));
                        }
                    });
                }
            } catch (err) {
                // Ignore parse errors for formatted headers
            }
        }

        ssh.dispose();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkFlows();
