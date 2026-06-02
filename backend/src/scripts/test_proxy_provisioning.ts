import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProxiesService } from '../modules/proxies/proxies.service';
import { InstancesService } from '../modules/instances/instances.service';
import { DataSource } from 'typeorm';

async function bootstrap() {
    try {
        console.log('Initializing Application Context for Proxy Provisioning Test...');
        const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });

        const proxiesService = app.get(ProxiesService);
        const dataSource = app.get(DataSource);

        // 1. Get a valid tenant ID from DB
        const tenantResult = await dataSource.query('SELECT id, name FROM tenants LIMIT 1');
        if (tenantResult.length === 0) {
            console.error('No tenants found in database! Please run seed or create a tenant.');
            await app.close();
            process.exit(1);
        }

        const tenantId = tenantResult[0].id;
        const tenantName = tenantResult[0].name;
        console.log(`Using Tenant: ${tenantName} (${tenantId})`);

        // 2. Clear out any previous test proxy or instance if we want to start clean
        console.log('\n--- STEP 1: Testing ProxiesService.buyProxyFromProvider ---');
        try {
            const proxy = await proxiesService.buyProxyFromProvider(tenantId);
            console.log('Successfully allocated and registered proxy:');
            console.log(JSON.stringify(proxy, null, 2));

            // Test the proxy to make sure it responds / works
            console.log('\n--- STEP 2: Testing Proxy Connectivity ---');
            const testResult = await proxiesService.testProxy({
                host: proxy.host,
                port: proxy.port,
                type: 'socks5',
                username: proxy.username,
                password: proxy.password
            });
            console.log('Proxy test result:');
            console.log(JSON.stringify(testResult, null, 2));

        } catch (e) {
            console.error('Failed to buy/allocate proxy:', e);
        }

        await app.close();
        process.exit(0);
    } catch (err) {
        console.error('Bootstrap error:', err);
        process.exit(1);
    }
}
bootstrap();
