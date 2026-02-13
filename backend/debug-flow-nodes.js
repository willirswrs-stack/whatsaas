require('dotenv').config();
const { Client } = require('pg');

async function debugFlowNodes() {
    const client = new Client({
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
    });

    try {
        await client.connect();

        // Pega todos os fluxos
        const res = await client.query('SELECT id, name, nodes FROM flows');

        console.log(`Encontrados ${res.rows.length} fluxos.`);

        res.rows.forEach(flow => {
            console.log(`\nFluxo: ${flow.name} (${flow.id})`);

            if (!flow.nodes || !Array.isArray(flow.nodes)) {
                console.log('  Sem nós ou formato inválido');
                return;
            }

            console.log(`  Total de nós: ${flow.nodes.length}`);

            flow.nodes.forEach((node, idx) => {
                const type = node.type || node.data?.type;

                // Se for delay ou parecer delay, mostra detalhes completos
                if (['delay', 'wait', 'esperar', 'DelayNode'].includes(type) || JSON.stringify(node).toLowerCase().includes('delay')) {
                    console.log(`  [${idx}] Nó suspeito de Delay:`);
                    console.log(`    ID: ${node.id}`);
                    console.log(`    Type (raiz): ${node.type}`);
                    console.log(`    Data.Type: ${node.data?.type}`);
                    console.log(`    Label: ${node.data?.label}`);
                    console.log(`    Config:`, JSON.stringify(node.data?.config));
                }
            });
        });

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

debugFlowNodes();
