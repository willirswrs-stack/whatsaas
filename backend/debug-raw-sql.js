
require('dotenv').config();
const { Client } = require('pg');

async function debugRaw() {
    console.log('--- AMBIENTE ---');
    console.log('DB Host:', process.env.DATABASE_HOST);
    console.log('DB Port:', process.env.DATABASE_PORT);
    console.log('DB User:', process.env.DATABASE_USER);
    console.log('DB Name:', process.env.DATABASE_NAME);

    const client = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'wathsaas',
    });

    try {
        await client.connect();
        console.log('✅ Conectado ao PostgreSQL!');

        // 1. Count flow_executions
        const countRes = await client.query('SELECT COUNT(*) FROM flow_executions');
        console.log(`\nTotal de execuções: ${countRes.rows[0].count}`);

        // 2. Get last execution
        const lastExecRes = await client.query(`
            SELECT id, flow_id, contact_id, instance_id, status, current_node_id, logs, started_at
            FROM flow_executions
            ORDER BY started_at DESC
            LIMIT 1
        `);

        if (lastExecRes.rows.length === 0) {
            console.log('❌ Nenhuma execução encontrada.');
        } else {
            const exec = lastExecRes.rows[0];
            console.log('\n--- ÚLTIMA EXECUÇÃO ---');
            console.log('ID:', exec.id);
            console.log('Flow ID:', exec.flow_id);
            console.log('Contact ID:', exec.contact_id);
            console.log('Instance ID:', exec.instance_id || '❌ NULL (nenhuma instância!)');
            console.log('Status:', exec.status);
            console.log('Passo Atual:', exec.current_node_id);
            console.log('Logs:', JSON.stringify(exec.logs, null, 2));

            // 3. Check if instance exists
            if (exec.instance_id) {
                const instRes = await client.query('SELECT id, instance_name, status, provider FROM instances WHERE id = $1', [exec.instance_id]);
                if (instRes.rows.length > 0) {
                    const inst = instRes.rows[0];
                    console.log('\n--- INSTÂNCIA USADA ---');
                    console.log('Nome:', inst.instance_name);
                    console.log('Status:', inst.status, inst.status === 'connected' ? '✅' : '❌');
                    console.log('Provider:', inst.provider);
                } else {
                    console.log('\n❌ INSTÂNCIA DELETADA! ID', exec.instance_id, 'não existe mais no banco.');
                }
            }
        }

        // 4. List available instances
        const instListRes = await client.query('SELECT id, instance_name, status FROM instances');
        console.log('\n--- INSTÂNCIAS DISPONÍVEIS ---');
        instListRes.rows.forEach(i => {
            console.log(`- ${i.instance_name} (${i.status}) [${i.id}]`);
        });

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await client.end();
    }
}

debugRaw();
