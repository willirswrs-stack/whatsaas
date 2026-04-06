
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
        console.log('Connected to DB');

        // Check for tenants
        const res = await client.query('SELECT * FROM tenants LIMIT 1');
        if (res.rows.length > 0) {
            console.log('FOUND_TENANT_ID:', res.rows[0].id);
        } else {
            console.log('NO_TENANTS_FOUND');
            // Create one if needed?
            const insert = await client.query(`
                INSERT INTO tenants (name, email, plan, status) 
                VALUES ('Test Tenant', 'test@test.com', 'pro', 'active') 
                RETURNING id
            `);
            console.log('CREATED_TENANT_ID:', insert.rows[0].id);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
})();
