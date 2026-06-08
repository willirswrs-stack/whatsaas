import { Client } from 'pg';
import { config } from 'dotenv';
config();

async function run() {
    const client = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5433'),
        user: process.env.DATABASE_USER || 'wathsaas',
        password: process.env.DATABASE_PASSWORD || 'wathsaas_secret_2024',
        database: process.env.DATABASE_NAME || 'wathsaas',
    });

    try {
        await client.connect();
        
        const nowRes = await client.query('SELECT NOW() as db_now, CURRENT_TIMESTAMP as db_ts');
        console.log('Database time:', nowRes.rows[0]);
        
        const campaignId = '8abdda0e-eede-4044-80a3-2a5fefa1a026';
        
        console.log(`--- Checking Campaign ${campaignId} ---`);
        const campaignRes = await client.query(`
            SELECT id, name, status, instance_id, instance_ids, total_contacts, sent_count, failed_count
            FROM campaigns
            WHERE id = $1
        `, [campaignId]);
        console.log('Campaign:', JSON.stringify(campaignRes.rows[0], null, 2));

        const failedRes = await client.query(`
            SELECT cc.id, cc.status, cc.error_message, cc.failed_at, c.phone, c.name
            FROM campaign_contacts cc
            JOIN contacts c ON cc.contact_id = c.id
            WHERE cc.campaign_id = $1 AND cc.status = 'failed'
            LIMIT 10
        `, [campaignId]);
        console.log('Failed Contacts:', failedRes.rows);

        const instancesRes = await client.query(`
            SELECT id, instance_name, status, phone
            FROM instances
            WHERE tenant_id = (SELECT tenant_id FROM campaigns WHERE id = $1)
        `, [campaignId]);
        console.log('Instances for this Tenant in WhatSaas DB:', instancesRes.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
