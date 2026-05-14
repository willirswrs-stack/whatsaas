const { Client } = require('pg');
const c = new Client({
    host: '127.0.0.1',
    port: 5433,
    user: 'wathsaas',
    password: 'wathsaas_secret_2024',
    database: 'wathsaas'
});
c.connect()
    .then(() => c.query('SELECT id, instance_name, status, phone, warmup_day, daily_sent, created_at, connected_at FROM instances ORDER BY created_at DESC LIMIT 10'))
    .then(r => {
        console.log(JSON.stringify(r.rows, null, 2));
        c.end();
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
