
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
        console.log('--- STARTING AGGRESSIVE DB FIX ---');

        const tables = [
            'proxies', 'instances', 'campaigns', 'contacts',
            'campaign_contacts', 'message_variations', 'tenants',
            'users', 'flows', 'flow_executions', 'flow_triggers', 'flow_folders'
        ];

        // 1. DROP POLICIES WITH CASCADE
        console.log('1. Dropping Policies (CASCADE)...');
        for (const table of tables) {
            try {
                // Drop policies
                await client.query(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table} CASCADE;`);
                await client.query(`DROP POLICY IF EXISTS "tenant_isolation_${table}" ON ${table} CASCADE;`);

                // Disable RLS
                await client.query(`ALTER TABLE IF EXISTS ${table} DISABLE ROW LEVEL SECURITY;`);
            } catch (e) {
                // Ignore table not found
            }
        }

        // 2. ENSURE TENANT_ID IS NULLABLE (Temporarily for sync)
        console.log('2. Altering tenant_id to NULLABLE to satisfy sync...');
        for (const table of tables) {
            try {
                await client.query(`ALTER TABLE IF EXISTS ${table} ALTER COLUMN tenant_id DROP NOT NULL;`);
                console.log(`Made tenant_id nullable in ${table}`);
            } catch (e) {
                // Ignore if column doesn't exist
            }
        }

        console.log('--- FIX COMPLETE ---');

    } catch (err) {
        console.error('Fatal:', err);
    } finally {
        await client.end();
    }
}

run();
