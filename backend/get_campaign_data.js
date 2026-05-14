const { Client } = require('pg');
const fs = require('fs');

async function run() {
    const client = new Client({
        host: 'localhost', port: 5433, user: 'wathsaas', password: 'wathsaas_secret_2024', database: 'wathsaas'
    });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT c.id as campaign_id, c.name, ct.phone, cc.status, cc.message_id, cc.error_message, cc.sent_at
            FROM campaigns c
            JOIN campaign_contacts cc ON c.id = cc.campaign_id
            JOIN contacts ct ON cc.contact_id = ct.id
            WHERE c.name = 'Teste Trype-Angle Utilidade'
            ORDER BY c.created_at DESC, cc.sent_at DESC
            LIMIT 20
        `);
        fs.writeFileSync('campaign_results.json', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        fs.writeFileSync('campaign_results.json', JSON.stringify({ error: e.message }, null, 2));
    } finally {
        await client.end();
    }
}
run();
