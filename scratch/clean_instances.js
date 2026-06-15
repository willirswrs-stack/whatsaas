const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

async function clean() {
    try {
        await ssh.connect(config);
        const fetchResult = await ssh.execCommand('curl -s -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" http://localhost:8081/instance/fetchInstances');
        
        let instances;
        try {
            instances = JSON.parse(fetchResult.stdout);
        } catch (e) {
            console.error('Failed to parse instances:', fetchResult.stdout);
            process.exit(1);
        }
        
        if (!Array.isArray(instances)) {
            console.log('No instances found or invalid response.');
            process.exit(0);
        }
        
        for (const instance of instances) {
            console.log(`Deleting ${instance.name}...`);
            const delResult = await ssh.execCommand(`curl -s -X DELETE -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" http://localhost:8081/instance/delete/${instance.name}`);
            console.log(delResult.stdout);
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

clean();
