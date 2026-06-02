const { Client } = require('pg');

const PG_CONFIG = {
    host: 'localhost',
    port: 5433,
    user: 'wathsaas',
    password: 'wathsaas_secret_2024',
    database: 'wathsaas'
};

async function check() {
    const client = new Client(PG_CONFIG);
    await client.connect();

    const res = await client.query(`
        SELECT id, instance_name, phone, status, provider, updated_at 
        FROM instances
    `);

    console.table(res.rows);
    await client.end();
}

check();
