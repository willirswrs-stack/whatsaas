
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
        console.log('Connected. disable RLS and dropping policies...');

        // Lista de tabelas comuns
        const tables = ['proxies', 'instances', 'campaigns', 'contacts', 'campaign_contacts', 'message_variations', 'tenants', 'users', 'flows', 'flow_executions', 'flow_triggers', 'flow_folders'];

        for (const table of tables) {
            try {
                // Tenta desabilitar RLS
                await client.query(`ALTER TABLE IF EXISTS ${table} DISABLE ROW LEVEL SECURITY;`);

                // Tenta dropar policy comum
                await client.query(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table};`);
                await client.query(`DROP POLICY IF EXISTS "tenant_isolation_${table}" ON ${table};`);

                console.log(`Processed ${table}`);
            } catch (e) {
                // Ignore table not found
                if (e.code === '42P01') {
                    console.log(`Table ${table} does not exist.`);
                } else {
                    console.log(`Note for ${table}: ${e.message}`);
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
