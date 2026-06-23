const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const PG = 'docker exec -i whatsaas-postgres psql -U postgres -d wathsaas';
const EVO_URL = 'https://evolution.whatsaas.online';
const EVO_KEY = 'whatsaas_evolution_key_2024';

// tenant_id do 3169 (encontrado anteriormente)
const TENANT_ID = 'c2f2de44-baf3-417c-9b64-d5cd467cc646';
// instance_id do 3169 (encontrado anteriormente)
const INST_ID = '26f4c146-7f3c-429a-97c2-bfc96db452cf';
const INST_NAME = '3169';

function q(sql) {
    return `${PG} -c "${sql}" 2>&1`;
}

async function limpeza3169() {
    console.log('=== LIMPEZA DEFINITIVA DA INSTÂNCIA 3169 ===\n');
    console.log(`Tenant ID: ${TENANT_ID}`);
    console.log(`Instance ID: ${INST_ID}`);
    console.log(`Instance Name: ${INST_NAME}\n`);

    try {
        await ssh.connect({ host: '2.25.159.205', username: 'root', password: '981952897Wr@', readyTimeout: 30000 });
        console.log('✅ Conectado!\n');

        // ─────────────────────────────────────────────
        // 1. Verificar Instance na tabela PascalCase (Evolution)
        // ─────────────────────────────────────────────
        console.log('1. Verificando instância na tabela "Instance" (Evolution):');
        const evoInst = await ssh.execCommand(q(
            `SELECT id, name FROM \\"Instance\\" WHERE name = '${INST_NAME}' OR name = 'loja-${INST_NAME}';`
        ));
        console.log(evoInst.stdout || evoInst.stderr);

        // ─────────────────────────────────────────────
        // 2. Preview campanhas do tenant
        // ─────────────────────────────────────────────
        console.log('\n2. Campanhas do tenant 3169:');
        const camps = await ssh.execCommand(q(
            `SELECT id, name, status, instance_id FROM campaigns WHERE tenant_id = '${TENANT_ID}' ORDER BY created_at DESC;`
        ));
        console.log(camps.stdout || camps.stderr);

        // ─────────────────────────────────────────────
        // 3. Campaign_contacts pendentes do tenant
        // ─────────────────────────────────────────────
        console.log('\n3. Campaign contacts pendentes:');
        const cc = await ssh.execCommand(q(
            `SELECT status, COUNT(*) FROM campaign_contacts WHERE campaign_id IN (SELECT id FROM campaigns WHERE tenant_id = '${TENANT_ID}') GROUP BY status;`
        ));
        console.log(cc.stdout || cc.stderr);

        // ─────────────────────────────────────────────
        // 4. Cancelar/deletar campaign_contacts
        // ─────────────────────────────────────────────
        console.log('\n4. Deletando campaign_contacts...');
        const delCC = await ssh.execCommand(q(
            `DELETE FROM campaign_contacts WHERE campaign_id IN (SELECT id FROM campaigns WHERE tenant_id = '${TENANT_ID}');`
        ));
        console.log(delCC.stdout || delCC.stderr);

        // ─────────────────────────────────────────────
        // 5. Deletar campanhas
        // ─────────────────────────────────────────────
        console.log('\n5. Deletando campanhas...');
        const delCamp = await ssh.execCommand(q(
            `DELETE FROM campaigns WHERE tenant_id = '${TENANT_ID}';`
        ));
        console.log(delCamp.stdout || delCamp.stderr);

        // ─────────────────────────────────────────────
        // 6. Deletar warmup_schedules da instância
        // ─────────────────────────────────────────────
        console.log('\n6. Deletando warmup_schedules do 3169...');
        const delWarmup = await ssh.execCommand(q(
            `DELETE FROM warmup_schedules WHERE instance_id = '${INST_ID}' OR instance_id = '${INST_NAME}';`
        ));
        console.log(delWarmup.stdout || delWarmup.stderr);

        // ─────────────────────────────────────────────
        // 7. Deletar message_outbox pendente
        // ─────────────────────────────────────────────
        console.log('\n7. Deletando message_outbox pendente...');
        const delOutbox = await ssh.execCommand(q(
            `DELETE FROM message_outbox WHERE instance_id = '${INST_ID}' AND status IN ('pending', 'queued', 'scheduled');`
        ));
        console.log(delOutbox.stdout || delOutbox.stderr);

        // ─────────────────────────────────────────────
        // 8. Deletar instância na Evolution API (ambos os nomes)
        // ─────────────────────────────────────────────
        console.log('\n8. Deletando na Evolution API...');
        const delEvo1 = await ssh.execCommand(
            `curl -s -X DELETE -H "apikey: ${EVO_KEY}" ${EVO_URL}/instance/delete/${INST_NAME}`
        );
        console.log(`  DELETE /3169: ${delEvo1.stdout}`);

        const delEvo2 = await ssh.execCommand(
            `curl -s -X DELETE -H "apikey: ${EVO_KEY}" ${EVO_URL}/instance/delete/loja-${INST_NAME}`
        );
        console.log(`  DELETE /loja-3169: ${delEvo2.stdout}`);

        // ─────────────────────────────────────────────
        // 9. Deletar tabela Instance (Evolution Schema)
        // ─────────────────────────────────────────────
        console.log('\n9. Deletando da tabela Evolution Instance...');
        const delEvoInst = await ssh.execCommand(q(
            `DELETE FROM \\"Instance\\" WHERE name = '${INST_NAME}' OR name = 'loja-${INST_NAME}';`
        ));
        console.log(delEvoInst.stdout || delEvoInst.stderr);

        // ─────────────────────────────────────────────
        // 10. Deletar instância da tabela WhatSaaS
        // ─────────────────────────────────────────────
        console.log('\n10. Deletando instância da tabela WhatSaaS...');
        const delInst = await ssh.execCommand(q(
            `DELETE FROM instances WHERE id = '${INST_ID}';`
        ));
        console.log(delInst.stdout || delInst.stderr);

        // ─────────────────────────────────────────────
        // 11. Verificação final
        // ─────────────────────────────────────────────
        console.log('\n✅ VERIFICAÇÃO FINAL:');
        const v1 = await ssh.execCommand(q(`SELECT COUNT(*) as campanhas FROM campaigns WHERE tenant_id = '${TENANT_ID}';`));
        console.log('Campanhas restantes:', v1.stdout);
        const v2 = await ssh.execCommand(q(`SELECT COUNT(*) as instancias FROM instances WHERE id = '${INST_ID}';`));
        console.log('Instância no banco:', v2.stdout);
        const v3 = await ssh.execCommand(`curl -s -H "apikey: ${EVO_KEY}" ${EVO_URL}/instance/connectionState/${INST_NAME}`);
        console.log('Estado na Evolution:', v3.stdout);

        ssh.dispose();
        console.log('\n=== LIMPEZA CONCLUÍDA COM SUCESSO ===');

    } catch (err) {
        console.error('Erro:', err.message || err);
        try { ssh.dispose(); } catch(e) {}
    }
}

limpeza3169();
