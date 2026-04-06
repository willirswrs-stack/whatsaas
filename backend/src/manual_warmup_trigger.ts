
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WarmupService } from './modules/anti-ban/warmup.service';

async function bootstrap() {
    try {
        console.log('Initializing Application Context...');
        const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });

        const warmupService = app.get(WarmupService);
        // HARDCODED TENANT ID (Willian's Tenant)
        const tenantId = 'd5e5febe-f7dc-40bd-8f73-da5367f30c0e';

        console.log(`Triggering warmup session for tenant: ${tenantId}`);
        try {
            const result = await warmupService.createWarmupSession(tenantId);
            console.log('---------------------------------------------------');
            console.log('WARMUP SESSION RESULT:');
            console.log(JSON.stringify(result, null, 2));
            console.log('---------------------------------------------------');
        } catch (e) {
            console.error('Error executing warmup session:', e);
        }

        await app.close();
        process.exit(0);
    } catch (err) {
        console.error('Bootstrap error:', err);
        process.exit(1);
    }
}
bootstrap();
