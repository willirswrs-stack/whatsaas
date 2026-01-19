
import { Client } from 'pg';

async function fixMissing() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'wathsaas',
        password: 'wathsaas_secret_2024',
        database: 'wathsaas',
    });

    try {
        await client.connect();
        console.log('Adding missing columns...');

        await client.query(`
      ALTER TABLE instances ADD COLUMN IF NOT EXISTS warmup_enabled BOOLEAN DEFAULT true;
      ALTER TABLE instances ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 10;
      ALTER TABLE instances ADD COLUMN IF NOT EXISTS daily_sent INTEGER DEFAULT 0;
      ALTER TABLE instances ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITHOUT TIME ZONE;
    `);

        console.log('Columns added successfully.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixMissing();
