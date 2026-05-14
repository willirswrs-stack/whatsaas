require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

function decrypt(text) {
    try {
        const [ivText, encryptedText] = text.split(':');
        if (!ivText || !encryptedText) return text; // Try raw
        
        const iv = Buffer.from(ivText, 'hex');
        const keyRaw = process.env.ENCRYPTION_KEY || 'whatsaas_fixed_encryption_key_2024_secure';
        // The key must be 32 bytes
        const key = Buffer.alloc(32);
        Buffer.from(keyRaw).copy(key);
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error('Decryption failed:', e.message);
        return text; // Return as is
    }
}

async function run() {
    const client = new Client({ 
        host: process.env.DATABASE_HOST, 
        port: parseInt(process.env.DATABASE_PORT || '5433'), 
        user: process.env.DATABASE_USER, 
        password: process.env.DATABASE_PASSWORD, 
        database: process.env.DATABASE_NAME 
    });
    try {
        await client.connect();
        const res = await client.query('SELECT access_token, waba_id FROM waba_accounts LIMIT 1');
        if (res.rows.length === 0) {
            fs.writeFileSync('template_meta_result.json', JSON.stringify({ error: 'No WABA account' }));
            return;
        }
        const account = res.rows[0];
        const token = decrypt(account.access_token);
        const templateName = 'order_update_no_cta_1';
        const url = `https://graph.facebook.com/v18.0/${account.waba_id}/message_templates?name=${templateName}&access_token=${token}`;
        const resp = await axios.get(url);
        fs.writeFileSync('template_meta_result.json', JSON.stringify(resp.data.data[0] || { error: 'Not found' }, null, 2));
    } catch (e) {
        fs.writeFileSync('template_meta_result.json', JSON.stringify({ error: e.message, response: e.response?.data }, null, 2));
    } finally {
        await client.end();
    }
}
run();
