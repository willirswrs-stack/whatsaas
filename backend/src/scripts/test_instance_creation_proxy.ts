import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InstancesService } from '../modules/instances/instances.service';
import { ProxiesService } from '../modules/proxies/proxies.service';
import { DataSource } from 'typeorm';

async function bootstrap() {
    try {
        console.log('Initializing Application Context for Instance Proxy Binding Test...');
        const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

        const instancesService = app.get(InstancesService);
        const proxiesService = app.get(ProxiesService);
        const dataSource = app.get(DataSource);

        // 1. Fetch a valid tenant ID from DB
        const tenantResult = await dataSource.query('SELECT id, name FROM tenants LIMIT 1');
        if (tenantResult.length === 0) {
            console.error('No tenants found in database!');
            await app.close();
            process.exit(1);
        }

        const tenantId = tenantResult[0].id;
        console.log(`Using Tenant: ${tenantResult[0].name} (${tenantId})`);

        // 2. Generate a unique name for the WhatsApp instance
        const instanceName = `teste-proxy-${Math.random().toString(36).substring(7)}`;
        console.log(`\n--- STEP 1: Creating WhatsApp Instance: "${instanceName}" ---`);
        console.log('This should automatically provision a Webshare SOCKS5 proxy and link it.');

        const result = await instancesService.create(tenantId, {
            instanceName,
            provider: 'evolution'
        });

        const instance = result.instance;
        console.log('✅ Instance created successfully:');
        console.log(`   ID: ${instance.id}`);
        console.log(`   Name: ${instance.instanceName}`);
        console.log(`   Proxy ID: ${instance.proxyId || 'NONE (FAIL)'}`);

        if (!instance.proxyId) {
            throw new Error('FAILED: No proxy was allocated to the new instance!');
        }

        // 3. Verify in DB that the proxy is bound in both directions
        console.log('\n--- STEP 2: Verifying Proxy Binding in DB ---');
        
        // Check proxy record
        const proxyResult = await dataSource.query(
            'SELECT id, host, port, "assignedInstanceId" FROM proxies WHERE id = $1',
            [instance.proxyId]
        );

        if (proxyResult.length === 0) {
            throw new Error(`FAILED: Allocated Proxy ID ${instance.proxyId} does not exist in DB!`);
        }

        const proxy = proxyResult[0];
        console.log('Allocated Proxy Record in DB:');
        console.log(`   Proxy ID: ${proxy.id}`);
        console.log(`   IP:Port: ${proxy.host}:${proxy.port}`);
        console.log(`   assignedInstanceId: ${proxy.assignedInstanceId || 'NULL (FAIL)'}`);

        if (proxy.assignedInstanceId === instance.id) {
            console.log('✅ SUCCESS: Bidirectional binding verified (instances.proxy_id <-> proxies.assignedInstanceId)');
        } else {
            console.error(`❌ FAILURE: Proxy assignedInstanceId (${proxy.assignedInstanceId}) does not match Instance ID (${instance.id})`);
        }

        // 4. Test Deleting the Instance to verify the Proxy is freed/released
        console.log(`\n--- STEP 3: Deleting WhatsApp Instance "${instanceName}" ---`);
        console.log('This should automatically release/free the SOCKS5 proxy in the DB.');

        await instancesService.delete(instance.id, tenantId);
        console.log('✅ Instance deleted successfully.');

        // 5. Verify the proxy assignedInstanceId is now NULL
        console.log('\n--- STEP 4: Verifying Proxy Release in DB ---');
        const releasedProxyResult = await dataSource.query(
            'SELECT id, "assignedInstanceId" FROM proxies WHERE id = $1',
            [instance.proxyId]
        );

        const releasedProxy = releasedProxyResult[0];
        console.log(`   Proxy ID: ${releasedProxy.id}`);
        console.log(`   assignedInstanceId after deletion: ${releasedProxy.assignedInstanceId}`);

        if (releasedProxy.assignedInstanceId === null) {
            console.log('✅ SUCCESS: Proxy was successfully freed and returned to the pool!');
        } else {
            console.error('❌ FAILURE: Proxy is still bound to instance:', releasedProxy.assignedInstanceId);
        }

        await app.close();
        process.exit(0);
    } catch (err: any) {
        console.error('Bootstrap error:', err.message);
        process.exit(1);
    }
}
bootstrap();
