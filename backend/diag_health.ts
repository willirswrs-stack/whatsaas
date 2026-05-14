import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ChipHealthService } from './src/modules/anti-ban/chip-health.service';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const healthService = app.get(ChipHealthService);

    // Digite o ID da instância aqui
    const targetId = '7f7da09c-f1a1-452e-b406-704b7555c325'; // willian-2897
    
    try {
        const scoreFactors = await healthService.calculateDetailedScore(targetId);
        console.log("--- HEALTH DIAGNOSTIC ---");
        console.log(JSON.stringify(scoreFactors, null, 2));
    } catch (e) {
        console.error(e);
    }
    await app.close();
}
run();
