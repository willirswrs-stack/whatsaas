const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

async function seedPlans() {
  await client.connect();
  console.log('Connected to DB...');

  try {
    // Opcional: Limpar planos antigos para evitar duplicidades (cuidado se houver Fks ativas)
    // Para não quebrar tenants existentes, vamos apenas desvincular temporariamente se necessário, 
    // ou usar UPSERT. Vamos usar UPDATE/INSERT com UPSERT em 'name'.
    
    const plans = [
      {
        name: 'Trial Gratúito',
        max_instances: 1,
        max_monthly_messages: 500,
        max_contacts: 100,
        ai_enabled: true,
        warmup_enabled: true,
        price: 0.00,
        billing_cycle: 'trial',
        features: JSON.stringify({
           trialDays: 3,
           support: 'Comunidade',
           voiceCloning: false, // Bloqueado ElevenLabs no trial
           advancedAntiBan: false
        })
      },
      {
        name: 'Plano Starter',
        max_instances: 3,
        max_monthly_messages: 5000,
        max_contacts: 2000,
        ai_enabled: true,
        warmup_enabled: true,
        price: 97.00,
        billing_cycle: 'monthly',
        features: JSON.stringify({
           support: 'Email',
           voiceCloning: true,
           advancedAntiBan: true
        })
      },
      {
        name: 'Plano Pro',
        max_instances: 10,
        max_monthly_messages: 999999, // Ilimitado
        max_contacts: 10000,
        ai_enabled: true,
        warmup_enabled: true,
        price: 197.00,
        billing_cycle: 'monthly',
        features: JSON.stringify({
           support: 'Prioritário Whatsapp',
           voiceCloning: true,
           advancedAntiBan: true,
           premiumDashboard: true
        })
      },
      {
        name: 'Plano Enterprise',
        max_instances: 30,
        max_monthly_messages: 999999,
        max_contacts: 50000,
        ai_enabled: true,
        warmup_enabled: true,
        price: 497.00,
        billing_cycle: 'monthly',
        features: JSON.stringify({
           support: 'Gerente Dedicado 1-a-1',
           voiceCloning: true,
           advancedAntiBan: true,
           multiUser: true,
           whiteLabel: true
        })
      }
    ];

    console.log('Iniciando inserção de planos...');

    for (const plan of plans) {
       // Verificar se já existe pelo nome
       const exists = await client.query("SELECT id FROM subscription_plans WHERE name = $1", [plan.name]);
       
       if (exists.rows.length > 0) {
          console.log(`Atualizando plano existente: ${plan.name}`);
          await client.query(`
             UPDATE subscription_plans 
             SET max_instances = $1, max_monthly_messages = $2, max_contacts = $3, 
                 ai_enabled = $4, warmup_enabled = $5, price = $6, 
                 billing_cycle = $7, features = $8
             WHERE name = $9
          `, [plan.max_instances, plan.max_monthly_messages, plan.max_contacts, plan.ai_enabled, plan.warmup_enabled, plan.price, plan.billing_cycle, plan.features, plan.name]);
       } else {
          console.log(`Criando novo plano: ${plan.name}`);
          await client.query(`
             INSERT INTO subscription_plans (id, name, max_instances, max_monthly_messages, max_contacts, ai_enabled, warmup_enabled, price, billing_cycle, features)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [plan.name, plan.max_instances, plan.max_monthly_messages, plan.max_contacts, plan.ai_enabled, plan.warmup_enabled, plan.price, plan.billing_cycle, plan.features]);
       }
    }

    console.log('\n✅ TODOS OS PLANOS FORAM ATUALIZADOS E INSERIDOS COM SUCESSO!');

  } catch (err) {
    console.error('Erro ao rodar seed de planos:', err);
  } finally {
    await client.end();
  }
}

seedPlans();
