const { Pool } = require('pg');
const pool = new Pool({host: 'localhost', port: 5433, user: 'wathsaas', password: 'wathsaas_secret_2024', database: 'wathsaas'});
pool.query('SELECT * FROM campaign_contacts ORDER BY updated_at DESC LIMIT 6').then(res => { console.log(res.rows); process.exit(0); }).catch(console.error);
