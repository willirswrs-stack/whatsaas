const { Queue } = require('bullmq');
const { Client } = require('pg');
const Redis = require('ioredis');

// Config
const PG_CONFIG = {
    host: 'localhost',
    port: 5433,
    user: 'wathsaas',
    password: 'wathsaas_secret_2024',
    database: 'wathsaas'
};

const REDIS_CONFIG = {
    host: '127.0.0.1',
    port: 6379,
    password: 'wathsaas_redis_2024'
};

const QUEUE_NAME = 'dispatch-queue';

async function run() {
    console.log('🚀 Starting Manual Dispatch...');

    // 1. Fetch Queued Contacts
    const client = new Client(PG_CONFIG);
    await client.connect();

    console.log('📦 Connected to DB. Fetching "queued" contacts...');
    const res = await client.query(`
        SELECT cc.id, cc.campaign_id, cc.contact_id, c.tenant_id 
        FROM campaign_contacts cc
        JOIN campaigns c ON cc.campaign_id = c.id
        WHERE cc.status = 'queued' AND c.status = 'running'
    `);

    console.log(`Found ${res.rowCount} queued contacts in RUNNING campaigns.`);

    if (res.rowCount === 0) {
        console.log('✅ Nothing to dispatch.');
        await client.end();
        return;
    }

    // 2. Enqueue to Redis
    console.log(`🔌 Connecting to Redis Queue: ${QUEUE_NAME}...`);
    const queue = new Queue(QUEUE_NAME, {
        connection: REDIS_CONFIG
    });

    const jobs = res.rows.map(row => ({
        name: `dispatch-${row.id}`,
        data: {
            tenantId: row.tenant_id,
            campaignContactId: row.id,
            campaignId: row.campaign_id,
        },
        opts: {
            jobId: `${row.id}-retry-${Date.now()}`, // Unique ID to force re-queue
            removeOnComplete: true,
            removeOnFail: false
        }
    }));

    console.log(`📤 Adding ${jobs.length} jobs to queue...`);

    // Add in batches
    const batchSize = 50;
    for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        await queue.addBulk(batch);
        console.log(`   Added batch ${i} - ${i + batch.length}`);
    }

    console.log('✅ All jobs enqueued!');

    const counts = await queue.getJobCounts();
    console.log('📊 Current Queue Stats:', counts);

    await queue.close();
    await client.end();
}

run().catch(console.error);
