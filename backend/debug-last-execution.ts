
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { FlowExecution } from './src/modules/flows/entities/flow.entity';
import { Campaign } from './src/modules/campaigns/entities/campaign.entity';

async function debugLastExecution() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const dataSource = app.get(DataSource);

    console.log('--- DIAGNÓSTICO DE ÚLTIMA EXECUÇÃO ---');

    // 1. Check last Campaign
    const campaignRepo = dataSource.getRepository(Campaign);
    const lastCampaign = await campaignRepo.find({
        order: { createdAt: 'DESC' },
        take: 1
    });

    if (lastCampaign.length > 0) {
        console.log(`\nÚltima Campanha: ${lastCampaign[0].name} (ID: ${lastCampaign[0].id})`);
        console.log(`Status: ${lastCampaign[0].status}`);
        console.log(`Flow ID: ${lastCampaign[0].flowId}`);
    } else {
        console.log('\nNenhuma campanha encontrada.');
    }

    // 2. Check last Flow Execution
    const executionRepo = dataSource.getRepository(FlowExecution);
    const lastExecution = await executionRepo.find({
        order: { startedAt: 'DESC' },
        take: 1
    });

    if (lastExecution.length > 0) {
        const exec = lastExecution[0];
        console.log(`\nÚltima Execução de Fluxo:`);
        console.log(`ID: ${exec.id}`);
        console.log(`Flow ID: ${exec.flowId}`);
        console.log(`Contact ID: ${exec.contactId}`);
        console.log(`Status: ${exec.status}`);
        console.log(`Passo Atual: ${exec.currentNodeId}`);
        console.log(`Variáveis:`, JSON.stringify(exec.variables, null, 2));
        console.log(`\nLOGS DA EXECUÇÃO:`);
        if (exec.logs && exec.logs.length > 0) {
            exec.logs.forEach((log, index) => {
                console.log(`[${index + 1}] ${log.timestamp} - ${log.nodeId} - ${log.action}`);
                if (log.data) console.log(`   Dados:`, JSON.stringify(log.data));
            });
        } else {
            console.log('   Sem logs registrados.');
        }
    } else {
        console.log('\nNenhuma execução de fluxo encontrada.');
    }

    await app.close();
}

debugLastExecution();
