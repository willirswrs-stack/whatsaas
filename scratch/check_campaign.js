const { Client } = require('pg');

const client = new Client({
  user: 'wathsaas',
  password: 'wathsaas_secret_2024',
  host: 'localhost',
  port: 5433,
  database: 'wathsaas',
});

async function main() {
  try {
    await client.connect();
    
    // Check if campaign 123 exists
    const campaignRes = await client.query('SELECT * FROM "campaign" WHERE id = $1', [123]);
    if (campaignRes.rows.length === 0) {
      console.log('Campaign 123 not found in "campaign" table.');
      
      // Let's check table names
      const tablesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
      console.log('Tables:', tablesRes.rows.map(r => r.table_name));
    } else {
      console.log('Campaign 123:', campaignRes.rows[0]);
    }
    
    // Try campaigns if campaign didn't work
    if (campaignRes.rows.length === 0) {
      const campaignsRes = await client.query('SELECT * FROM "campaigns" WHERE id = $1', [123]).catch(e => ({ rows: [] }));
      if (campaignsRes.rows.length > 0) {
        console.log('Campaign 123 (from campaigns table):', campaignsRes.rows[0]);
      }
    }

    const contactsRes = await client.query('SELECT * FROM "campaign_contacts" WHERE "campaignId" = $1 OR "campaign_id" = $1', [123]).catch(e => ({ rows: [] }));
    console.log('Campaign Contacts:', contactsRes.rows);

  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

main();
