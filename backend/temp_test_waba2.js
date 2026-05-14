const { Client } = require('pg');

const client = new Client({
    user: 'wathsaas',
    host: 'localhost',
    database: 'wathsaas',
    password: 'wathsaas_secret_2024',
    port: 5433,
});

(async () => {
    try {
        await client.connect();
        
        const contactsRes = await client.query(`
            SELECT c.name, c.phone, cc.status, cc.message_id, cc.error_message
            FROM campaign_contacts cc
            JOIN contacts c ON cc.contact_id = c.id
            WHERE cc.campaign_id = '934149e9-11ba-4475-bc2f-e8d1de8bc7b7'
        `);
        console.log('Errors from failed campaign 934149e9-11ba-4475-bc2f-e8d1de8bc7b7:');
        console.dir(contactsRes.rows, { depth: null });
        
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
})();
