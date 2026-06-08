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
        console.log('--- 📊 CAMPANHAS EM EXECUÇÃO ---');
        
        // 1. Obter campanhas ativas/executando
        const campaignsRes = await client.query(`
            SELECT id, name, status, total_contacts, sent_count, delivered_count, read_count, failed_count, started_at, instance_id, instance_ids
            FROM campaigns
            WHERE status IN ('active', 'running', 'scheduled') OR (status = 'completed' AND created_at > NOW() - INTERVAL '1 hour')
            ORDER BY created_at DESC
        `);
        console.log('Campanhas encontradas:', JSON.stringify(campaignsRes.rows, null, 2));

        for (const campaign of campaignsRes.rows) {
            console.log(`\n--- Detalhes da Campanha: ${campaign.name} (${campaign.id}) ---`);
            
            // 2. Obter contagem de contatos da campanha agrupados por status
            const statusRes = await client.query(`
                SELECT status, COUNT(*) as count 
                FROM campaign_contacts 
                WHERE campaign_id = $1
                GROUP BY status
            `, [campaign.id]);
            console.log('Status dos Contatos da Campanha:', statusRes.rows);

            // 3. Obter contatos que falharam e os erros correspondentes
            const failedContactsRes = await client.query(`
                SELECT id, status, error_message, updated_at
                FROM campaign_contacts
                WHERE campaign_id = $1 AND status = 'failed'
                LIMIT 5
            `, [campaign.id]);
            if (failedContactsRes.rows.length > 0) {
                console.log('Amostra de contatos falhos:', failedContactsRes.rows);
            }
        }

        // 4. Obter as últimas 10 mensagens na tabela de mensagens (inbox)
        console.log('\n--- 📥 ÚLTIMAS MENSAGENS SALVAS NA INBOX ---');
        const messagesRes = await client.query(`
            SELECT id, direction, type, content, status, campaign_id, created_at
            FROM messages
            ORDER BY created_at DESC
            LIMIT 10
        `);
        console.log(JSON.stringify(messagesRes.rows, null, 2));

        // 5. Obter instâncias (chips) conectadas
        console.log('\n--- 📱 STATUS DOS CHIPS (INSTÂNCIAS) ---');
        const instancesRes = await client.query(`
            SELECT id, instance_name, status, phone, daily_sent, daily_limit, warmup_day, warmup_enabled
            FROM instances
        `);
        console.log(JSON.stringify(instancesRes.rows, null, 2));

        // 6. Obter todos os templates
        console.log('\n--- 📝 TEMPLATES NO BANCO ---');
        const templatesRes = await client.query(`
            SELECT id, name, content, content_type, media_config, variables
            FROM templates
        `);
        console.log(JSON.stringify(templatesRes.rows, null, 2));

    } catch (err) {
        console.error('Erro ao verificar status:', err);
    } finally {
        await client.end();
    }
}

run();
