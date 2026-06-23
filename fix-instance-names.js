const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fix() {
    await ssh.connect({
        host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000
    });

    const db = 'wathsaas';
    const apiKey = '429683C4C977415CAAFCCE10F7D57E11';

    console.log('Buscando instâncias na Evolution API...');
    const evoRaw = await ssh.execCommand(`curl -s -m 15 "http://localhost:8081/instance/fetchInstances" -H "apikey: ${apiKey}"`);
    
    let evoInstances = [];
    try {
        evoInstances = JSON.parse(evoRaw.stdout);
        console.log('Instâncias na Evolution:');
        evoInstances.forEach(i => console.log(`  - name="${i.name}" | state="${i.connectionStatus}"`));
    } catch(e) {
        console.error('Erro ao parsear Evolution:', e.message, evoRaw.stdout.substring(0, 500));
        process.exit(1);
    }

    console.log('\nInstâncias no Banco de Dados:');
    const dbInst = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT id, instance_name, status, provider FROM instances ORDER BY status;"`);
    console.log(dbInst.stdout);

    // Mapear instâncias do banco para os nomes corretos na Evolution
    // A lógica: se instance_name do banco é "loja-XXXX" e existe um "XXXX" na Evolution → atualizar
    const dbRows = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -t -c "SELECT id, instance_name FROM instances;"`);
    
    const rows = dbRows.stdout.trim().split('\n').filter(r => r.trim()).map(r => {
        const parts = r.split('|').map(p => p.trim());
        return { id: parts[0], instanceName: parts[1] };
    });

    console.log('\nVerificando discrepâncias...');
    let updatesNeeded = 0;
    
    for (const row of rows) {
        if (!row.id || !row.instanceName) continue;
        
        const exactMatch = evoInstances.find(e => e.name === row.instanceName);
        if (exactMatch) {
            console.log(`  ✅ "${row.instanceName}" → OK (existe na Evolution)`);
            continue;
        }

        // Tentar sem prefixo "loja-"
        const nameWithoutPrefix = row.instanceName.replace('loja-', '').replace('whatsaas-', '');
        const partialMatch = evoInstances.find(e => e.name === nameWithoutPrefix || e.name === row.instanceName || row.instanceName.endsWith(e.name));
        
        if (partialMatch) {
            console.log(`  🔧 "${row.instanceName}" → deve ser "${partialMatch.name}" (corrigindo...)`);
            const update = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "UPDATE instances SET instance_name='${partialMatch.name}' WHERE id='${row.id}';"`);
            console.log('    Resultado:', update.stdout.trim());
            updatesNeeded++;
        } else {
            console.log(`  ❓ "${row.instanceName}" → NÃO encontrado na Evolution (${evoInstances.map(e=>e.name).join(', ')})`);
        }
    }

    if (updatesNeeded > 0) {
        console.log(`\n✅ ${updatesNeeded} instância(s) corrigida(s) no banco!`);
    } else {
        console.log('\nNenhuma atualização necessária ou nenhuma correspondência encontrada.');
        console.log('Fazendo match manual para instância loja-3169 → 3169...');
        
        const manualFix = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "UPDATE instances SET instance_name='3169' WHERE instance_name='loja-3169';"`);
        console.log(manualFix.stdout || manualFix.stderr);
    }

    console.log('\n=== ESTADO FINAL DAS INSTÂNCIAS NO BANCO ===');
    const final = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -c "SELECT id, instance_name, status, provider FROM instances;"`);
    console.log(final.stdout);

    console.log('\n=== TESTANDO ENVIO AGORA COM O NOME CORRETO ===');
    const dbInstName = await ssh.execCommand(`docker exec whatsaas-postgres psql -U postgres -d ${db} -t -c "SELECT instance_name FROM instances WHERE status='connected' LIMIT 1;"`);
    const newName = dbInstName.stdout.trim();
    console.log('Instância para teste:', newName);
    
    if (newName) {
        const sendTest = await ssh.execCommand(`curl -s -m 15 -X POST "http://localhost:8081/message/sendText/${newName}" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"number":"5567981108910","text":"TESTE PÓS CORREÇÃO - agora deve chegar! ${new Date().toLocaleTimeString()}"}'`);
        console.log('Resultado:', sendTest.stdout || '(sem resposta)');
    }

    process.exit(0);
}

fix().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
