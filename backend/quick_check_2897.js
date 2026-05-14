const { Client } = require('pg');
const c = new Client({
    host: '127.0.0.1', port: 5433, user: 'wathsaas', password: 'wathsaas_secret_2024', database: 'wathsaas'
});
c.connect()
    .then(() => c.query("SELECT id, instance_name, phone, status FROM instances WHERE instance_name LIKE '%2897%'"))
    .then(r => {
        console.log("DB RESULTS FOR 2897:");
        console.log(JSON.stringify(r.rows, null, 2));
        c.end();
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
