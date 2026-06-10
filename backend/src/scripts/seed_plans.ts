import { DataSource } from 'typeorm';
import { SubscriptionPlan, Tenant, User } from '../modules/tenants/entities/tenant.entity';

require('dotenv').config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'wathsaas',
    entities: [SubscriptionPlan, Tenant, User],
    synchronize: false,
});

const plans = [
    // Starter
    { name: 'Starter', maxInstances: 3, price: 97.90, billingCycle: 'MONTHLY' },
    { name: 'Starter', maxInstances: 3, price: 264.33, billingCycle: 'QUARTERLY' },
    { name: 'Starter', maxInstances: 3, price: 499.29, billingCycle: 'SEMIANNUALLY' },
    { name: 'Starter', maxInstances: 3, price: 939.84, billingCycle: 'YEARLY' },

    // Pro
    { name: 'Pro', maxInstances: 5, price: 147.90, billingCycle: 'MONTHLY' },
    { name: 'Pro', maxInstances: 5, price: 399.33, billingCycle: 'QUARTERLY' },
    { name: 'Pro', maxInstances: 5, price: 754.29, billingCycle: 'SEMIANNUALLY' },
    { name: 'Pro', maxInstances: 5, price: 1419.84, billingCycle: 'YEARLY' },

    // Agency
    { name: 'Agency', maxInstances: 10, price: 247.90, billingCycle: 'MONTHLY' },
    { name: 'Agency', maxInstances: 10, price: 669.33, billingCycle: 'QUARTERLY' },
    { name: 'Agency', maxInstances: 10, price: 1264.29, billingCycle: 'SEMIANNUALLY' },
    { name: 'Agency', maxInstances: 10, price: 2379.84, billingCycle: 'YEARLY' },

    // Enterprise
    { name: 'Enterprise', maxInstances: 20, price: 397.90, billingCycle: 'MONTHLY' },
    { name: 'Enterprise', maxInstances: 20, price: 1074.33, billingCycle: 'QUARTERLY' },
    { name: 'Enterprise', maxInstances: 20, price: 2029.29, billingCycle: 'SEMIANNUALLY' },
    { name: 'Enterprise', maxInstances: 20, price: 3819.84, billingCycle: 'YEARLY' },
];

async function seed() {
    await AppDataSource.initialize();
    console.log("Banco conectado com sucesso!");

    const repo = AppDataSource.getRepository(SubscriptionPlan);
    
    for (const plan of plans) {
        const exists = await repo.findOne({ where: { name: plan.name, billingCycle: plan.billingCycle } });
        if (!exists) {
            const newPlan = repo.create(plan);
            await repo.save(newPlan);
            console.log(`✅ Plano CRIADO: ${plan.name} (${plan.billingCycle}) -> R$ ${plan.price}`);
        } else {
            exists.price = plan.price;
            exists.maxInstances = plan.maxInstances;
            await repo.save(exists);
            console.log(`🔄 Plano ATUALIZADO: ${plan.name} (${plan.billingCycle}) -> R$ ${plan.price}`);
        }
    }
    
    console.log("🚀 Todos os planos foram injetados no Banco!");
    process.exit(0);
}

seed().catch(err => {
    console.error("ERRO FATAL NO SEED:", err);
    process.exit(1);
});
