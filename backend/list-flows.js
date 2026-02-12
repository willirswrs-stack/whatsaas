require('dotenv').config();
const { Client } = require('pg');

async function listFlows() {
    const client = new Client({
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT),
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
    });

    await client.connect();
    const res = await client.query('SELECT id, name, status FROM flows');
    console.log('Fluxos no banco:', res.rows);
    await client.end();
}

listFlows();
