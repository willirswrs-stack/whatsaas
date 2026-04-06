
import { Client } from 'pg';

async function checkCampaigns() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'wathsaas',
        password: 'wathsaas_secret_2024',
        database: 'wathsaas',
    });

    try {
        await client.connect();
        console.log('Checking recent campaigns...');
        const res = await client.query(`
        SELECT id, name, status, total_contacts, sent_count, created_at 
        FROM campaigns 
        ORDER BY created_at DESC 
        LIMIT 5
    `);
        console.table(res.rows);

        if (res.rows.length > 0) {
            const campaignId = res.rows[0].id;
            console.log(`Checking contacts for campaign ${campaignId}...`);
            const contacts = await client.query(`
            SELECT id, status, retry_count, error_message 
            FROM campaign_contacts 
            WHERE campaign_id = '${campaignId}'
        `);
            console.table(contacts.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkCampaigns();
