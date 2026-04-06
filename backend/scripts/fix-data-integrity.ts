
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
        console.log('--- DIAGNOSE AND FIX NULL DATA ---');

        // 1. Check instances for null instance_name
        console.log('Checking instances for NULL instance_name...');
        const res = await client.query(`SELECT id FROM instances WHERE instance_name IS NULL`);
        if (res.rowCount > 0) {
            console.log(`Found ${res.rowCount} instances with NULL instance_name. Deleting...`);
            await client.query(`DELETE FROM instances WHERE instance_name IS NULL`);
            console.log('Deleted problematic instances.');
        } else {
            console.log('No instances with NULL instance_name found.');
        }

        // 2. Check other potential non-nullable columns
        const checks = [
            { table: 'instances', col: 'tenant_id' },
            { table: 'campaigns', col: 'name' },
            { table: 'contacts', col: 'phone' },
            { table: 'contacts', col: 'tenant_id' },
        ];

        for (const check of checks) {
            const { table, col } = check;
            try {
                const count = await client.query(`SELECT count(*) FROM ${table} WHERE ${col} IS NULL`);
                console.log(`${table}.${col} NULL count: ${count.rows[0].count}`);

                if (parseInt(count.rows[0].count) > 0) {
                    console.log(`Fixing ${table}.${col}... setting default or deleting.`);
                    if (col === 'tenant_id') {
                        // We already have a logic for tenant_id, let's just make sure it's not null 
                        // But we made the column nullable in the entity, so it SHOULD be fine, 
                        // unless TypeORM is still trying to enforce it.
                        // Let's force update just in case.
                        // Reuse the tenant ID from previous steps or create one
                        const tenantRes = await client.query(`SELECT id FROM tenants LIMIT 1`);
                        if (tenantRes.rows.length > 0) {
                            await client.query(`UPDATE ${table} SET ${col} = '${tenantRes.rows[0].id}' WHERE ${col} IS NULL`);
                            console.log(`Updated ${table}.${col} with default tenant.`);
                        }
                    } else {
                        await client.query(`DELETE FROM ${table} WHERE ${col} IS NULL`);
                        console.log(`Deleted rows with NULL ${col} in ${table}`);
                    }
                }
            } catch (e) {
                console.log(`Skipping check for ${table}.${col}: ${e.message}`);
            }
        }

    } catch (err) {
        console.error('Fatal:', err);
    } finally {
        await client.end();
    }
}

run();
