
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

        const campaignId = 'c75c761d-00df-45d5-9839-c579e18c494e';
        console.log(`Verificando campanha: Teste de envio (${campaignId})`);

        const colCheck = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'campaign_contacts'`);
        const cols = colCheck.rows.map(r => r.column_name);

        const campaignCol = cols.includes('campaign_id') ? 'campaign_id' : '"campaignId"';
        const contactCol = cols.includes('contact_id') ? 'contact_id' : '"contactId"';
        const errorCol = cols.includes('error_message') ? 'error_message' : '"errorMessage"';

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
