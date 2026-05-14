const { Client } = require('pg');
const fs = require('fs');

async function run() {
    const client = new Client({
        host: 'localhost', port: 5433, user: 'wathsaas', password: 'wathsaas_secret_2024', database: 'wathsaas'
    });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT settings FROM campaigns WHERE name = 'Teste Trype-Angle Utilidade' ORDER BY created_at DESC LIMIT 1
        `);
        fs.writeFileSync('campaign_settings.json', JSON.stringify(res.rows[0].settings, null, 2));
    } catch (e) {
        fs.writeFileSync('campaign_settings.json', JSON.stringify({ error: e.message }, null, 2));
    } finally {
        await client.end();
    }
}
run();
