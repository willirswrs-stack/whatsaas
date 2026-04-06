
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

        // Check for empty instance names
        const res = await client.query(`SELECT id, instance_name FROM instances WHERE instance_name IS NULL OR instance_name = ''`);
        console.log(`Found ${res.rowCount} invalid instances.`);
        if (res.rowCount > 0) {
            console.log(res.rows);
            await client.query(`DELETE FROM instances WHERE instance_name IS NULL OR instance_name = ''`);
            console.log('Deleted.');
        }

        // Force instance_name to be nullable in DB just to be safe (hack)
        await client.query(`ALTER TABLE instances ALTER COLUMN instance_name DROP NOT NULL`);
        console.log('Altered instance_name to be nullable.');

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
