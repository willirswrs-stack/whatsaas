const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'wathsaas',
    password: 'wathsaas_secret_2024',
    database: 'wathsaas',
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database');

        const checkTable = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'waba_accounts'");

        if (checkTable.rows.length === 0) {
            console.log('Table waba_accounts does not exist. Creating...');
            await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
            await client.query(`
                CREATE TABLE waba_accounts (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    tenant_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    waba_id TEXT NOT NULL,
                    phone_number_id TEXT NOT NULL,
                    phone_number TEXT NOT NULL,
                    access_token TEXT NOT NULL,
                    app_id TEXT,
                    display_name TEXT,
                    quality_rating TEXT,
                    status TEXT DEFAULT 'active',
                    about TEXT,
                    description TEXT,
                    category TEXT,
                    email TEXT,
                    profile_photo TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);
            console.log('✅ Table waba_accounts created successfully');
        } else {
            console.log('✅ Table waba_accounts already exists');
        }
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
        process.exit(0);
    }
}

run();
