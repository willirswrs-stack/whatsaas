const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5433,
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'whatsaas',
});

async function main() {
    await client.connect();
    const res = await client.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'proxies' ORDER BY ordinal_position"
    );
    console.log('=== Colunas da tabela proxies ===');
    res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
    await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
