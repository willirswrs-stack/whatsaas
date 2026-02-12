
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { FlowExecution } from './src/modules/flows/entities/flow.entity';
import { Instance } from './src/modules/instances/entities/instance.entity';
import { Contact } from './src/modules/campaigns/entities/campaign.entity';

async function deepDebugExecution() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const dataSource = app.get(DataSource);

    // Execution ID from previous log
    const execId = '61df7b79-0fc9-4bd0-8654-135e870d2878';

    const execRepo = dataSource.getRepository(FlowExecution);
    const execution = await execRepo.findOne({ where: { id: execId } });

    if (!execution) {
        console.log('Execution not found');
        return;
    }

    console.log('--- EXECUTION DETAILS ---');
    console.log(`Execution ID: ${execution.id}`);
    console.log(`Instance ID (in execution): ${execution.instanceId}`);
    console.log(`Contact ID (in execution): ${execution.contactId}`);

    // Check Instance
    if (execution.instanceId) {
        const instanceRepo = dataSource.getRepository(Instance);
        const instance = await instanceRepo.findOne({ where: { id: execution.instanceId } });
        console.log('\n--- INSTANCE CHECK ---');
        if (instance) {
            console.log(`Instance Found: ${instance.instanceName}`);
            console.log(`Status: ${instance.status}`);
            console.log(`Provider: ${instance.provider}`);
        } else {
            console.log('❌ Instance ID found in execution but NOT in database (Deleted?)');
        }
    } else {
        console.log('\n❌ Execution has NO Instance ID assigned!');
    }

    // Check Contact
    const contactRepo = dataSource.getRepository(Contact);
    const contact = await contactRepo.findOne({ where: { id: execution.contactId } });
    console.log('\n--- CONTACT CHECK ---');
    if (contact) {
        console.log(`Contact Found: ${contact.name}`);
        console.log(`Phone: ${contact.phone}`);
    } else {
        console.log('❌ Contact not found');
    }

    await app.close();
}

deepDebugExecution();
