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
        
        const cmpRes = await client.query(`
            SELECT settings FROM campaigns WHERE id = '7ced5e3d-a48a-4ff2-9c1c-c5ca469fe51a'
        `);
        console.log('Settings for campaign 7ced5e3d:');
        console.dir(cmpRes.rows[0].settings, { depth: null });
        
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
})();
