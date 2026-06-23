const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const config = {
    host: '2.25.159.205',
    username: 'root',
    password: '981952897Wr@',
    readyTimeout: 60000
};

const query = `
UPDATE campaign_contacts
SET phone = 
    CASE 
        WHEN length(regexp_replace(phone, '\\D', '', 'g')) = 10 THEN '55' || regexp_replace(phone, '\\D', '', 'g')
        WHEN length(regexp_replace(phone, '\\D', '', 'g')) = 11 THEN '55' || regexp_replace(phone, '\\D', '', 'g')
        WHEN length(regexp_replace(phone, '\\D', '', 'g')) = 12 AND substring(regexp_replace(phone, '\\D', '', 'g') from 1 for 2) = '55' THEN 
            substring(regexp_replace(phone, '\\D', '', 'g') from 1 for 4) || '9' || substring(regexp_replace(phone, '\\D', '', 'g') from 5)
        ELSE regexp_replace(phone, '\\D', '', 'g')
    END;
`;

async function fixDb() {
    try {
        console.log('🔌 Conectando...');
        await ssh.connect(config);
        console.log('✅ Conectado com sucesso!');

        console.log('🛠 Executando query...');
        const cmd = `docker exec whatsaas-postgres psql -U postgres -d wathsaas -c "${query.replace(/\n/g, ' ')}"`;
        const res = await ssh.execCommand(cmd);
        
        console.log('=== RESULT ===');
        console.log(res.stdout || res.stderr);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixDb();
