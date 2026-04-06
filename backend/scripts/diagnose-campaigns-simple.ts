
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

        console.log('\n--- Últimas Campanhas ---');
        const campaigns = await client.query(`
            SELECT 
                id, 
                name, 
                status, 
                tenant_id,
                instance_id,
                instance_ids
            FROM campaigns 
            ORDER BY created_at DESC
            LIMIT 5;
        `);
        console.table(campaigns.rows);

        console.log('\n--- Instâncias ---');
        const instances = await client.query(`
            SELECT 
                id, 
                name, 
                status, 
                tenant_id
            FROM instances;
        `);
        console.table(instances.rows);

    } catch (err) {
        console.error('Erro na diagnose:', err);
    } finally {
        await client.end();
    }
}

diagnoseCampaigns();
