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
        
        // Let's get the most recent WABA campaigns
        const res = await client.query(`
            SELECT id, name, settings, status, total_contacts, sent_count, failed_count 
            FROM campaigns 
            WHERE settings::text LIKE '%wabaAccountId%' 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.dir(res.rows, { depth: null });
        
        if (res.rows.length > 0) {
            // Get contacts for the most recent campaign
            const cmpId = res.rows[0].id;
            const contactsRes = await client.query(`
                SELECT c.name, c.phone, cc.status, cc.message_id, cc.error_message
                FROM campaign_contacts cc
                JOIN contacts c ON cc.contact_id = c.id
                WHERE cc.campaign_id = $1
            `, [cmpId]);
            console.log('Contacts for Campaign', cmpId);
            console.dir(contactsRes.rows, { depth: null });
        }
        
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
})();
