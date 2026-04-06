
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { FlowExecution } from './src/modules/flows/entities/flow.entity';
import { Instance } from './src/modules/instances/entities/instance.entity';

async function checkLatestExecutionAndInstance() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const dataSource = app.get(DataSource);

    // 1. Get truly LAST execution
    const execRepo = dataSource.getRepository(FlowExecution);
    const lastExecs = await execRepo.find({
        order: { startedAt: 'DESC' },
        take: 1
    });

    if (lastExecs.length === 0) {
        console.log('Nenhuma execução encontrada no banco.');
        await app.close();
        return;
    }

    const exec = lastExecs[0];
    console.log('--- ÚLTIMA EXECUÇÃO ENCONTRADA ---');
    console.log(`ID Execução: ${exec.id}`);
    console.log(`Data Início: ${exec.startedAt}`);
    console.log(`Status: ${exec.status}`);
    console.log(`Instance ID usada: ${exec.instanceId || 'NENHUMA! (null)'}`);
    console.log(`Passo Atual: ${exec.currentNodeId}`);

    if (exec.instanceId) {
        // 2. Check validity of this instance
        const instanceRepo = dataSource.getRepository(Instance);
        const instance = await instanceRepo.findOne({ where: { id: exec.instanceId } });

        console.log('\n--- VERIFICAÇÃO DA INSTÂNCIA ---');
        if (instance) {
            console.log(`Nome: ${instance.instanceName}`);
            console.log(`ID: ${instance.id}`);
            console.log(`Status: ${instance.status} ${instance.status === 'connected' ? '✅' : '❌'}`);
            console.log(`Provider: ${instance.provider}`);
        } else {
            console.log('❌ A instância usada nesta execução NÃO EXISTE MAIS no banco de dados!');
            console.log('Isso explica a falha: O fluxo tentou usar uma instância deletada.');
        }
    } else {
        console.log('\n❌ ERRO CRÍTICO: Execução sem instância definida!');
        console.log('O fluxo iniciou sem saber por onde enviar a mensagem.');
    }

    // 3. List all AVAILABLE instances just to compare
    const instanceRepo = dataSource.getRepository(Instance);
    const allInstances = await instanceRepo.find();
    console.log('\n--- INSTÂNCIAS DISPONÍVEIS AGORA ---');
    allInstances.forEach(i => {
        console.log(`- ${i.instanceName} (${i.status}) [ID: ${i.id}]`);
    });

    await app.close();
}

checkLatestExecutionAndInstance();
