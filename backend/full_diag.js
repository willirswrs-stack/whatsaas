const { Client } = require('pg');

const client = new Client({
    host: 'localhost', port: 5433, user: 'wathsaas', password: 'wathsaas_secret_2024', database: 'wathsaas'
});

async function run() {
    await client.connect();

    console.log('=== RESUMO GERAL DE CONTATOS POR STATUS ===');
    const r1 = await client.query('SELECT status, count(*) as total FROM campaign_contacts GROUP BY status ORDER BY total DESC');
    console.table(r1.rows);

    console.log('\n=== CAMPANHAS COM STATUS "RUNNING" ===');
    const r2 = await client.query('SELECT id, name, status, instance_id, total_contacts, sent_count, failed_count FROM campaigns WHERE status = \'running\' ORDER BY created_at DESC');
    console.table(r2.rows);

    console.log('\n=== CONTATOS NA FILA (queued) POR CAMPANHA ===');
    const r3 = await client.query('SELECT campaign_id, count(*) as queued FROM campaign_contacts WHERE status = \'queued\' GROUP BY campaign_id');
    console.table(r3.rows);

    await client.end();
}
run();
