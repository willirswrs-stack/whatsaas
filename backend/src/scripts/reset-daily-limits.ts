import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function resetDailyLimits() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });

    try {
        const dataSource = app.get(DataSource);

        // Reset daily_sent and increase daily_limit for all instances
        const result = await dataSource.query(`
            UPDATE instances 
            SET daily_sent = 0, daily_limit = 1000 
            RETURNING instance_name, daily_sent, daily_limit, status
        `);

        console.log('✅ Instances updated:');
        console.table(result);

        // Also show all instances
        const instances = await dataSource.query(`
            SELECT instance_name, phone, status, provider, daily_sent, daily_limit 
            FROM instances
        `);
        console.log('\n📱 All instances:');
        console.table(instances);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await app.close();
    }
}

resetDailyLimits();
