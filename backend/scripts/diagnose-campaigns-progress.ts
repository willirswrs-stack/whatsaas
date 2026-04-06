
import { Client } from 'pg';

async function diagnoseCampaigns() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'wathsaas',
        password: 'wathsaas_secret_2024',
        database: 'wathsaas',
    });

    try {
        await client.connect();

        // Primeiro, vamos descobrir os nomes exatos das colunas
        const checkCols = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'campaigns'
        `);
        const cols = checkCols.rows.map(r => r.column_name);

        const totalCol = cols.includes('total_contacts') ? 'total_contacts' : (cols.includes('totalContacts') ? '"totalContacts"' : 'NULL as total');
        const processedCol = cols.includes('processed_contacts') ? 'processed_contacts' : (cols.includes('processedContacts') ? '"processedContacts"' : 'NULL as processed');
        const sentCol = cols.includes('sent_count') ? 'sent_count' : (cols.includes('sentCount') ? '"sentCount"' : 'NULL as sent');
        const pulseCol = cols.includes('last_pulse_at') ? 'last_pulse_at' : (cols.includes('lastPulseAt') ? '"lastPulseAt"' : 'NULL as pulse');
        const updatedCol = cols.includes('updated_at') ? 'updated_at' : (cols.includes('updatedAt') ? '"updatedAt"' : 'created_at');

        console.log('\n--- Status de Campanhas Ativas ---');
        const campaignsQuery = `
            SELECT 
                id, 
                name, 
                status, 
                ${totalCol} as total, 
                ${processedCol} as processed, 
                ${sentCol} as sent,
                ${pulseCol} as last_pulse
            FROM campaigns 
            WHERE status != 'completed'
            ORDER BY ${updatedCol} DESC;
        `;
        const campaigns = await client.query(campaignsQuery);
        console.table(campaigns.rows);

        console.log('\n--- Últimos Logs de Disparo (campaign_logs) ---');
        try {
            const logs = await client.query(`
                SELECT 
                    cl.status,
                    cl.error,
                    c.name as campaign_name,
                    cont.name as contact_name
                FROM campaign_logs cl
                JOIN campaigns c ON cl."campaignId" = c.id
                JOIN contacts cont ON cl."contactId" = cont.id
                ORDER BY cl."createdAt" DESC
                LIMIT 10;
            `);
            console.table(logs.rows);
        } catch (e) {
            console.log('Erro ao buscar campaign_logs. Verificando se a tabela existe...');
            const checkTable = await client.query("SELECT to_regclass('public.campaign_logs') as exists");
            console.log('Tabela campaign_logs:', checkTable.rows[0].exists || 'NÃO EXISTE');
        }

    } catch (err) {
        console.error('Erro na diagnose:', err);
    } finally {
        await client.end();
    }
}

diagnoseCampaigns();
