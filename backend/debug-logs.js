require('dotenv').config();
const { Client } = require('pg');

async function debugFlowLogs() {
    const client = new Client({
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
    });

    try {
        await client.connect();

        // Pega as últimas 5 execuções
        const executions = await client.query(`
            SELECT id, flow_id, status, current_node_id, logs, started_at 
            FROM flow_executions 
            ORDER BY started_at DESC 
            LIMIT 5
        `);

        console.log(`Encontradas ${executions.rows.length} execuções recentes.`);

        executions.rows.forEach((exec, idx) => {
            console.log(`\n[Execução ${idx}] ID: ${exec.id}, Status: ${exec.status}, Flow: ${exec.flow_id}`);
            console.log('Logs:');

            if (Array.isArray(exec.logs)) {
                exec.logs.forEach(log => {
                    console.log(`  [${log.timestamp}] Node: ${log.nodeId} | Action: ${log.action} | Data: ${JSON.stringify(log.data || {})}`);
                });
            } else {
                console.log('  Logs em formato inválido ou vazio:', exec.logs);
            }
        });

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

debugFlowLogs();
