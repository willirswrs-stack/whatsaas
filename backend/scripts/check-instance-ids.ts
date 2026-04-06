
import { Client } from 'pg';

async function checkInstanceIds() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'wathsaas',
        password: 'wathsaas_secret_2024',
        database: 'wathsaas',
    });

    try {
        await client.connect();

        console.log('\n--- Todas as Instâncias ---');
        const instances = await client.query(`
            SELECT 
                id, 
                instance_name, 
                status, 
                tenant_id
            FROM instances;
        `);
        console.table(instances.rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

checkInstanceIds();
