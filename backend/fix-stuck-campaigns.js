const { Client } = require('pg');

async function main() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'wathsaas',
        password: 'wathsaas_secret_2024',
        database: 'wathsaas',
    });

    await client.connect();

    console.log('=== Corrigindo Campanhas Presas ===');

    // Buscar campanhas "running" onde todos os contatos já foram processados
    const campaignsToFix = await client.query(`
    SELECT c.id, c.name, c.status, c.sent_count, c.failed_count, c.total_contacts,
           (c.sent_count + c.failed_count) as processed
    FROM campaigns c
    WHERE c.status = 'running'
      AND (c.sent_count + c.failed_count) >= c.total_contacts
  `);

    console.log(`Encontradas ${campaignsToFix.rows.length} campanhas para corrigir:`);
    console.table(campaignsToFix.rows);

    if (campaignsToFix.rows.length > 0) {
        // Atualizar todas para "completed"
        const ids = campaignsToFix.rows.map(r => `'${r.id}'`).join(',');
        const result = await client.query(`
      UPDATE campaigns 
      SET status = 'completed', completed_at = NOW()
      WHERE id IN (${ids})
    `);
        console.log(`\n✅ ${result.rowCount} campanhas atualizadas para 'completed'`);
    }

    // Verificar resultado
    console.log('\n=== Status Atualizado ===');
    const updated = await client.query(`
    SELECT status, COUNT(*) as count
    FROM campaigns 
    GROUP BY status
  `);
    console.table(updated.rows);

    await client.end();
}

main().catch(console.error);
