const { Client } = require('pg');
const fs = require('fs');

async function run() {
    const client = new Client({
        host: 'localhost', port: 5433, user: 'wathsaas', password: 'wathsaas_secret_2024', database: 'wathsaas'
    });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT name, components FROM meta_templates WHERE name = 'order_update_no_cta_1' LIMIT 1
        `);
        fs.writeFileSync('template_debug.json', JSON.stringify(res.rows[0] || { error: 'Not found' }, null, 2));
    } catch (e) {
        fs.writeFileSync('template_debug.json', JSON.stringify({ error: e.message }, null, 2));
    } finally {
        await client.end();
    }
}
run();
