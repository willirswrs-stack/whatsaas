
import { Client } from 'pg';

async function checkCampaignDetails() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'wathsaas',
        password: 'wathsaas_secret_2024',
        database: 'wathsaas',
    });

    try {
        await client.connect();

        console.log('\n--- Detalhes de Falhas da Última Campanha ---');
        const latestCampaign = await client.query(`
            SELECT id, name FROM campaigns ORDER BY created_at DESC LIMIT 1;
        `);
        if (latestCampaign.rows.length === 0) return;

        const campaignId = latestCampaign.rows[0].id;
        console.log(`Verificando campanha: ${latestCampaign.rows[0].name} (${campaignId})`);

        // Get columns to be sure
        const colCheck = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'campaign_contacts'`);
        const cols = colCheck.rows.map(r => r.column_name);

        const campaignCol = cols.includes('campaign_id') ? 'campaign_id' : '"campaignId"';
        const contactCol = cols.includes('contact_id') ? 'contact_id' : '"contactId"';
        const errorCol = cols.includes('error_message') ? 'error_message' : '"errorMessage"';

        const failures = await client.query(`
            SELECT 
                cc.status, 
                cc.${errorCol} as error,
                cont.name as contact_name
            FROM campaign_contacts cc
            JOIN contacts cont ON cc.${contactCol} = cont.id
            WHERE cc.${campaignCol} = $1
            LIMIT 10;
        `, [campaignId]);
        console.table(failures.rows);

        console.log('\n--- Contagem por Status ---');
        const counts = await client.query(`
            SELECT status, count(*) 
            FROM campaign_contacts 
            WHERE ${campaignCol} = $1
            GROUP BY status;
        `, [campaignId]);
        console.table(counts.rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

checkCampaignDetails();
