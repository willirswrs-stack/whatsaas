const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fullDiagnose() {
    await ssh.connect({
        host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000
    });

    const db = 'wathsaas';
    const apiKey = '429683C4C977415CAAFCCE10F7D57E11';

    console.log('=== TODAS AS INSTÂNCIAS NA EVOLUTION API ===');
    const evoRaw = await ssh.execCommand(`curl -s -m 15 "http://localhost:8081/instance/fetchInstances" -H "apikey: ${apiKey}"`);
    
    let evoInstances = [];
    try {
        evoInstances = JSON.parse(evoRaw.stdout);
    } catch(e) {
        console.error('Erro ao parsear:', evoRaw.stdout.substring(0, 500));
        process.exit(1);
    }

    console.log(`Total de instâncias na Evolution: ${evoInstances.length}`);
    evoInstances.forEach(i => {
        const phone = i.profilePictureUrl || i.ownerJid || i.owner || '';
        console.log(`  name="${i.name}" | state="${i.connectionStatus || i.state}" | owner="${i.ownerJid || ''}" | profileName="${i.profileName || ''}"`);
    });

    // Buscar detalhes de cada instância conectada
    const openInstances = evoInstances.filter(i => i.connectionStatus === 'open');
    console.log(`\nInstâncias abertas (open): ${openInstances.length}`);

    for (const inst of openInstances) {
        try {
            const detail = await ssh.execCommand(`curl -s -m 8 "http://localhost:8081/instance/connectionState/${inst.name}" -H "apikey: ${apiKey}"`);
            const data = JSON.parse(detail.stdout);
            console.log(`  ${inst.name}: state=${data.instance?.state || 'N/A'} | number=${JSON.stringify(data.instance?.profilePictureUrl || '')}`);
        } catch(e) {
            console.log(`  ${inst.name}: erro ao pegar detalhes`);
        }
    }

    console.log('\n=== INSTÂNCIAS NO BANCO ===');
    const dbRaw = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT id, instance_name, status, provider FROM instances ORDER BY status, instance_name;"`);
    console.log(dbRaw.stdout);

    // Verificar quais instâncias do banco existem na Evolution
    const dbRows2 = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -t -c "SELECT id, instance_name, status FROM instances;"`);
    
    const rows = dbRows2.stdout.trim().split('\n').filter(r => r.trim()).map(r => {
        const parts = r.split('|').map(p => p.trim());
        return { id: parts[0], instanceName: parts[1], status: parts[2] };
    });

    const evoNames = evoInstances.map(i => i.name);
    
    console.log('\n=== ANÁLISE DE SINCRONIZAÇÃO ===');
    console.log('Instâncias NO BANCO mas NÃO na Evolution (órfãs):');
    const orphans = rows.filter(r => !evoNames.includes(r.instanceName));
    orphans.forEach(r => console.log(`  DB: "${r.instanceName}" (${r.status}) → NÃO existe na Evolution`));

    console.log('\nInstâncias NA EVOLUTION mas NÃO no banco:');
    const dbNames = rows.map(r => r.instanceName);
    const missing = evoInstances.filter(i => !dbNames.includes(i.name));
    missing.forEach(i => console.log(`  Evolution: "${i.name}" (${i.connectionStatus}) → NÃO existe no banco`));

    // Perguntar se deve marcar as órfãs como disconnected
    if (orphans.length > 0) {
        console.log('\n=== CORRIGINDO STATUS DAS INSTÂNCIAS ÓRFÃS ===');
        console.log(`Marcando ${orphans.length} instâncias como "disconnected" no banco...`);
        for (const orphan of orphans) {
            const upd = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "UPDATE instances SET status='disconnected' WHERE id='${orphan.id}';"`);
            console.log(`  "${orphan.instanceName}": ${upd.stdout.trim()}`);
        }
    }

    console.log('\n=== ESTADO FINAL ===');
    const finalState = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT instance_name, status FROM instances ORDER BY status, instance_name;"`);
    console.log(finalState.stdout);

    // Teste de envio com instância 3169 (a que confirmamos funcionar)
    console.log('\n=== TESTE DE ENVIO com instância 3169 ===');
    const sendTest = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8081/message/sendText/3169" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"number":"5567981108910","text":"✅ Teste pós-correção TOTAL ${new Date().toLocaleTimeString()}"}'`);
    console.log('Resultado:', sendTest.stdout || '(sem resposta)');

    process.exit(0);
}

fullDiagnose().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
