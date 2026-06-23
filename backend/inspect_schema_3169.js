const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000 })
.then(async () => {
    const r1 = await ssh.execCommand('docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'instances\' ORDER BY ordinal_position;" 2>&1');
    console.log('COLUNAS - instances:');
    console.log(r1.stdout || r1.stderr);

    const r2 = await ssh.execCommand('docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'campaigns\' ORDER BY ordinal_position;" 2>&1');
    console.log('COLUNAS - campaigns:');
    console.log(r2.stdout || r2.stderr);

    const r3 = await ssh.execCommand('docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'campaign_contacts\' ORDER BY ordinal_position;" 2>&1');
    console.log('COLUNAS - campaign_contacts:');
    console.log(r3.stdout || r3.stderr);

    // Buscar instâncias com nome 3169
    const r4 = await ssh.execCommand('docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "SELECT * FROM instances WHERE instance_name ILIKE \'%3169%\';" 2>&1');
    console.log('Instâncias com 3169:');
    console.log(r4.stdout || r4.stderr);

    // Listar todas as tabelas
    const r5 = await ssh.execCommand('docker exec -i whatsaas-postgres psql -U postgres -d wathsaas -c "SELECT tablename FROM pg_tables WHERE schemaname = \'public\' ORDER BY tablename;" 2>&1');
    console.log('TODAS AS TABELAS:');
    console.log(r5.stdout || r5.stderr);

    ssh.dispose();
}).catch(e => { console.error(e.message); ssh.dispose(); });
