const { Client } = require('pg');
const c = new Client({ host:'127.0.0.1', port:5433, user:'wathsaas', password:'wathsaas_secret_2024', database:'wathsaas' });
c.connect()
    .then(() => c.query("UPDATE instances SET phone = '556281952897' WHERE instance_name = 'willian-2897'"))
    .then(() => {
         console.log('✅ PHONE NUMBER INJECTED INTO DB!');
         c.end();
    })
    .catch(e => { console.error(e); process.exit(1); });
