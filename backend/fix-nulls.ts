
import { Client } from 'pg';

const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'wathsaas',
    password: 'wathsaas_secret_2024',
    database: 'wathsaas',
});

async function run() {
    try {
        await client.connect();
        console.log('Fixing NULL tenant_ids...');

        // 1. Get a valid tenant or create one
        let tenantRes = await client.query(`SELECT id FROM tenants LIMIT 1`);
        let tenantId;

        if (tenantRes.rows.length === 0) {
            console.log('No tenant found. Creating default tenant...');
            const insertRes = await client.query(`
                INSERT INTO tenants (name, email, status, plan_id) 
                VALUES ('Default Tenant', 'admin@whatsaas.com', 'active', NULL)
                RETURNING id
            `);
            tenantId = insertRes.rows[0].id;
        } else {
            tenantId = tenantRes.rows[0].id;
        }

        console.log(`Using Tenant ID: ${tenantId}`);

        // 2. Fix NULLs in crucial tables
        const tables = ['instances', 'proxies', 'campaigns', 'contacts', 'campaign_contacts', 'message_variations', 'flows', 'flow_executions', 'flow_triggers', 'flow_folders'];

        for (const table of tables) {
            try {
                const res = await client.query(`
                    UPDATE ${table} 
                    SET tenant_id = '${tenantId}' 
                    WHERE tenant_id IS NULL
                `);
                if (res.rowCount > 0) {
                    console.log(`Updated ${res.rowCount} rows in ${table}`);
                } else {
                    console.log(`No NULL rows in ${table}`);
                }
            } catch (e) {
                // Ignore if table doesn't exist or column missing
                if (e.code === '42P01' || e.code === '42703') {
                    console.log(`Table ${table} skipped: ${e.message}`);
                } else {
                    console.log(`Error updating ${table}: ${e.message}`);
                }
            }
        }

    } catch (err) {
        console.error('Fatal:', err);
    } finally {
        await client.end();
    }
}

run();
