const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

(async () => {
    try {
        const pool = new Pool({host: 'localhost', port: 5433, user: 'wathsaas', password: 'wathsaas_secret_2024', database: 'wathsaas'});
        const res = await pool.query("SELECT * FROM waba_accounts WHERE status='active' LIMIT 1");
        const account = res.rows[0];
        
        // Decrypt token
        const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'whatsaas_fixed_encryption_key_2024_secure', 'utf-8');
        const textParts = account.access_token.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let key = ENCRYPTION_KEY;
        if (key.length > 32) key = key.slice(0, 32);
        else if (key.length < 32) key = Buffer.concat([key, Buffer.alloc(32 - key.length)]);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        const token = decrypted.toString();

        // fetch template
        const wabaId = account.waba_id;
        const resp = await axios.get(`https://graph.facebook.com/v18.0/${wabaId}/message_templates`, {
            params: { name: 'trip_angle_meta', fields: 'components' },
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(JSON.stringify(resp.data, null, 2));
    } catch(e) {
        console.error(e?.response?.data || e.message);
    }
    process.exit(0);
})();
