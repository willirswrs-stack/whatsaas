
import { Client } from 'pg';

async function diagnose() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'wathsaas',
        password: 'wathsaas_secret_2024',
        database: 'wathsaas',
    });

    try {
        await client.connect();
        console.log('Connected to DB.');

        // 1. Check Columns
        console.log('Checking columns in instances table...');
        const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'instances'
        ORDER BY column_name;
    `);
        console.table(cols.rows);

        // 2. Try a SELECT *
        console.log('Attempting SELECT * FROM instances LIMIT 1...');
        try {
            const res = await client.query('SELECT * FROM instances LIMIT 1');
            console.log('Select successful. Rows:', res.rows.length);
        } catch (e) {
            console.error('SELECT failed:', e.message);
        }

    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        await client.end();
    }
}

diagnose();
