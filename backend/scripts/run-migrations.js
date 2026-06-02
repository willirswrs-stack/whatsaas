const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
    const client = new Client({
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
    });

    try {
        await client.connect();
        console.log('Connected to the database.');

        const scripts = [
            'migrate-proxies-table.sql',
            'migrate-messages-table.sql'
        ];

        for (const script of scripts) {
            const sqlPath = path.join(__dirname, script);
            if (fs.existsSync(sqlPath)) {
                console.log(`Executing ${script}...`);
                const sql = fs.readFileSync(sqlPath, 'utf8');
                await client.query(sql);
                console.log(`Successfully executed ${script}`);
            } else {
                console.warn(`Script not found: ${sqlPath}`);
            }
        }
    } catch (e) {
        console.error('Error executing migrations:', e);
    } finally {
        await client.end();
        console.log('Disconnected from database.');
    }
}

run();
