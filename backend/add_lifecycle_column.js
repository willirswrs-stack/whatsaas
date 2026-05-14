const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://wathsaas:wathsaas_secret_2024@localhost:5433/wathsaas'
});

(async () => {
    try {
        await client.connect();
        console.log('Adding lifecycle_stage column to instances table...');
        await client.query(`
            ALTER TABLE instances 
            ADD COLUMN IF NOT EXISTS lifecycle_stage CHARACTER VARYING DEFAULT 'registration';
        `);
        console.log('✅ Column added successfully!');
        
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'instances' AND column_name = 'lifecycle_stage';
        `);
        console.log('Verification:', res.rows);
    } catch (err) {
        console.error('❌ Error updating schema:', err);
    } finally {
        await client.end();
    }
})();
