import { Client } from 'pg';
import { config } from 'dotenv';
config();

async function run() {
    const client = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5433'),
        user: process.env.DATABASE_USER || 'wathsaas',
        password: process.env.DATABASE_PASSWORD || 'wathsaas_secret_2024',
        database: process.env.DATABASE_NAME || 'wathsaas',
    });

    try {
        await client.connect();
        console.log('--- Checking tenants table ---');
        
        // Check tenants with email or slug
        const res = await client.query(`
            SELECT id, name, slug, email, status, plan_id, created_at 
            FROM tenants 
            WHERE email = $1 OR slug = $2
        `, ['multversogyn@gmail.com', 'multverso']);
        console.log('Matching Tenants:', JSON.stringify(res.rows, null, 2));
        
        const countRes = await client.query('SELECT count(*) FROM tenants');
        console.log('Total tenants in database:', countRes.rows[0].count);

    } catch (err) {
        console.error('Error running check:', err);
    } finally {
        await client.end();
    }
}

run();
