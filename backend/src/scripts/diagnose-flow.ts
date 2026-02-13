
import { DataSource } from 'typeorm';
import { FlowExecution } from '../modules/flows/entities/flow.entity';
import { dataSourceOptions } from '../config/database.config';
import { config } from 'dotenv';
import { Instance } from '../modules/instances/entities/instance.entity';

config();

async function diagnose() {
    const dataSource = new DataSource({
        ...dataSourceOptions,
        entities: ['src/modules/**/entities/*.entity.ts'],
    } as any);

    await dataSource.initialize();

    console.log('🔍 Diagnosing latest flow execution...');

    const executionRepository = dataSource.getRepository(FlowExecution);

    const latestExecution = await executionRepository.findOne({
        where: {},
        order: { startedAt: 'DESC' },
    });

    if (!latestExecution) {
        console.log('No executions found.');
        return;
    }

    console.log(`Execution ID: ${latestExecution.id}`);
    console.log(`Status: ${latestExecution.status}`);
    console.log(`Current Node: ${latestExecution.currentNodeId}`);
    console.log(`Next Action At: ${latestExecution.nextActionAt}`);

    console.log('\n📜 Execution Logs:');
    if (latestExecution.logs && Array.isArray(latestExecution.logs)) {
        latestExecution.logs.forEach((log, index) => {
            console.log(`[${index}] ${log.timestamp} - Action: ${log.action} (Node: ${log.nodeId})`);
            if (log.data) console.log(`    Data: ${JSON.stringify(log.data)}`);
        });
    } else {
        console.log('No logs found.');
    }

    await dataSource.destroy();
}

diagnose().catch(err => console.error(err));
