
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { Flow } from './src/modules/flows/entities/flow.entity';

async function checkFlowStatus() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const dataSource = app.get(DataSource);

    // Replace with the ID found in the previous step
    const flowId = '2f05bf8c-a6a5-4b05-81a2-8355c57e850c';
    const flowRepo = dataSource.getRepository(Flow);
    const flow = await flowRepo.findOne({ where: { id: flowId } });

    if (flow) {
        console.log(`Flow: ${flow.name}`);
        console.log(`Status: ${flow.status}`);
    } else {
        console.log('Flow not found');
    }

    await app.close();
}

checkFlowStatus();
