
import { Client } from 'pg';

async function diagnoseCampaigns() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'wathsaas',
        password: 'wathsaas_secret_2024',
        database: 'wathsaas',
    });

    try {
        await client.connect();
        console.log('Checking columns in campaigns table...');
        const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'campaigns'
        ORDER BY column_name;
    `);
        console.table(cols.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

diagnoseCampaigns();
