
const { Client } = require('pg');
const client = new Client({
    user: 'wathsaas',
    host: 'localhost',
    database: 'wathsaas',
    password: 'wathsaas_secret_2024',
    port: 5433,
});
client.connect()
    .then(() => {
        console.log('Connected to DB');
        return client.query('SELECT NOW()');
    })
    .then(res => {
        console.log('Query result:', res.rows[0]);
        process.exit(0);
    })
    .catch(e => {
        console.error('Connection error', e.stack);
        process.exit(1);
    });
