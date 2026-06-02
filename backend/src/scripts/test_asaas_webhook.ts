import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import axios from 'axios';

async function bootstrap() {
    try {
        console.log('Initializing Application Context for Asaas Webhook Test...');
        const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

        const dataSource = app.get(DataSource);

        // 1. Get a valid tenant ID from DB
        const tenantResult = await dataSource.query('SELECT id, name, status, "asaas_customer_id" FROM tenants LIMIT 1');
        if (tenantResult.length === 0) {
            console.error('No tenants found in database! Please run seed or create a tenant.');
            await app.close();
            process.exit(1);
        }

        const tenantId = tenantResult[0].id;
        const originalStatus = tenantResult[0].status;
        const fakeCustomerId = 'cust_test_webhook_123';

        console.log(`Using Tenant: ${tenantResult[0].name} (${tenantId})`);
        console.log(`Original status: ${originalStatus}`);

        // 2. Set the tenant status to suspended and set fake customer ID to test activation
        console.log('\n--- STEP 1: Setting up Tenant status as "suspended" and assigning fake Customer ID ---');
        await dataSource.query(
            `UPDATE tenants SET status = 'suspended', "asaas_customer_id" = $1 WHERE id = $2`,
            [fakeCustomerId, tenantId]
        );
        console.log('Tenant database record updated.');

        // 3. Hit the NestJS Webhook endpoint (running on port 3333) with a mock payload
        console.log('\n--- STEP 2: Sending Simulated PAYMENT_RECEIVED payload to NestJS Webhook ---');
        const webhookUrl = 'http://localhost:3333/api/v1/billing/webhook';
        const payload = {
            event: 'PAYMENT_RECEIVED',
            payment: {
                id: 'pay_1234567890',
                customer: fakeCustomerId,
                subscription: 'sub_fake_999',
                value: 97.00,
                netValue: 95.00,
                status: 'RECEIVED'
            }
        };

        try {
            const response = await axios.post(webhookUrl, payload, { timeout: 5000 });
            console.log(`Webhook responded with status ${response.status}:`);
            console.log(JSON.stringify(response.data, null, 2));

            // 4. Verify that the Tenant status has updated back to active
            console.log('\n--- STEP 3: Verifying Tenant Status in DB ---');
            const verifiedResult = await dataSource.query('SELECT id, name, status FROM tenants WHERE id = $1', [tenantId]);
            const newStatus = verifiedResult[0].status;
            
            console.log(`New tenant status: ${newStatus}`);
            if (newStatus === 'active') {
                console.log('✅ SUCCESS: Tenant status was successfully transitioned to "active" by the Webhook!');
            } else {
                console.error('❌ FAILURE: Tenant status is still:', newStatus);
            }

        } catch (e: any) {
            console.error('❌ Webhook request failed:', e.message);
            if (e.response) {
                console.error('Response data:', e.response.data);
            }
        } finally {
            // Restore original status
            await dataSource.query(
                `UPDATE tenants SET status = $1, "asaas_customer_id" = $2 WHERE id = $3`,
                [originalStatus, tenantResult[0].asaas_customer_id, tenantId]
            );
            console.log('\nRestored original Tenant status and Customer ID in DB.');
        }

        await app.close();
        process.exit(0);
    } catch (err) {
        console.error('Bootstrap error:', err);
        process.exit(1);
    }
}
bootstrap();
