
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { Instance } from './src/modules/instances/entities/instance.entity';

async function checkInstances() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const dataSource = app.get(DataSource);

    const instanceRepo = dataSource.getRepository(Instance);
    // Fetch all instances
    const instances = await instanceRepo.find();

    console.log(`\n--- STATUS DAS INSTÂNCIAS (${instances.length}) ---`);
    instances.forEach(inst => {
        console.log(`Nome: ${inst.instanceName}`);
        console.log(`ID: ${inst.id}`);
        console.log(`Status: ${inst.status}`);
        console.log(`Provider: ${inst.provider}`);

        console.log(`-----------------------------------`);
    });

    await app.close();
}

checkInstances();
