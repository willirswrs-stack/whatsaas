
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User, Tenant, SubscriptionPlan } from '../modules/tenants/entities/tenant.entity';
import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const logger = new Logger('Seed');

    // Inicializa contexto da aplicação
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });

    try {
        const dataSource = app.get(DataSource);
        const userRepo = dataSource.getRepository(User);
        const tenantRepo = dataSource.getRepository(Tenant);
        const planRepo = dataSource.getRepository(SubscriptionPlan);

        logger.log('🌱 Starting Database Seed...');

        // 1. Create Default Plans
        const plansValues = [
            { name: 'Free', price: 0, maxInstances: 1, maxMonthlyMessages: 1000 },
            { name: 'Starter', price: 97, maxInstances: 3, maxMonthlyMessages: 10000 },
            { name: 'Pro', price: 197, maxInstances: 10, maxMonthlyMessages: 50000 },
            { name: 'Enterprise', price: 497, maxInstances: 50, maxMonthlyMessages: 1000000 },
        ];

        let defaultPlan: SubscriptionPlan | null = null;

        for (const p of plansValues) {
            let plan = await planRepo.findOne({ where: { name: p.name } });
            if (!plan) {
                logger.log(`Creating plan: ${p.name}`);
                plan = planRepo.create(p);
                await planRepo.save(plan);
            }
            if (p.name === 'Starter') defaultPlan = plan;
        }

        // Fallback se não criou Starter
        if (!defaultPlan) {
            defaultPlan = await planRepo.findOne({ where: { name: 'Free' } });
        }

        if (!defaultPlan) throw new Error('Failed to create/find subscription plans');

        // 2. Check/Create Default Tenant
        let tenant = await tenantRepo.findOne({
            where: [
                { slug: 'default' },
                { email: 'admin@whatsaas.com' }
            ]
        });
        if (!tenant) {
            logger.log('Creating default tenant...');
            tenant = tenantRepo.create({
                name: 'Default Tenant',
                slug: 'default',
                email: 'admin@whatsaas.com',
                planId: defaultPlan.id,
            });
            await tenantRepo.save(tenant);
            logger.log(`✅ Tenant created: ${tenant.id}`);
        } else {
            logger.log(`ℹ️ Tenant already exists (${tenant.name}).`);
        }

        // 3. Check/Create Admin User
        const adminEmail = 'admin@whatsaas.com';
        let admin = await userRepo.findOne({ where: { email: adminEmail } });

        if (!admin) {
            logger.log('Creating admin user...');
            const salt = await bcrypt.genSalt();
            const passwordHash = await bcrypt.hash('admin123', salt);

            admin = userRepo.create({
                email: adminEmail,
                name: 'Admin WhatSaas',
                passwordHash,
                role: 'owner', // Role principal
                tenantId: tenant.id,
            });

            await userRepo.save(admin);
            logger.log(`✅ Admin created: ${admin.email} (password: admin123)`);
        } else {
            logger.log('ℹ️ Admin user already exists.');
        }

        logger.log('✨ Seed completed successfully!');
    } catch (error) {
        logger.error('❌ Seed failed:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap();
