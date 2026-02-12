
import 'dotenv/config'; // Force load .env
import { DataSource } from 'typeorm';
import { FlowExecution } from './src/modules/flows/entities/flow.entity';
import { Instance } from './src/modules/instances/entities/instance.entity';

console.log('--- AMBIENTE ---');
console.log('DB Host:', process.env.DATABASE_HOST);
console.log('DB Port:', process.env.DATABASE_PORT);
console.log('DB User:', process.env.DATABASE_USER);
console.log('DB Name:', process.env.DATABASE_NAME);

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'wathsaas',
    entities: [FlowExecution, Instance],
    synchronize: false,
});

async function checkReal() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Conectado ao banco corretamente!');

        const execRepo = AppDataSource.getRepository(FlowExecution);

        // Count total executions
        const count = await execRepo.count();
        console.log(`\nTotal de execuções na tabela: ${count}`);

        if (count === 0) {
            console.log('❌ Tabela vazia! O backend não está gravando aqui.');
            return;
        }

        // Get last one
        const lastExec = await execRepo.find({
            order: { startedAt: 'DESC' },
            take: 1
        });

        const exec = lastExec[0];
        console.log(`\n--- ÚLTIMA EXECUÇÃO REAL (${exec.startedAt}) ---`);
        console.log(`ID: ${exec.id}`);
        console.log(`Status: ${exec.status}`);
        console.log(`Logs:`, JSON.stringify(exec.logs, null, 2));

        console.log(`Instance ID: ${exec.instanceId}`);

        if (exec.instanceId) {
            const instanceRepo = AppDataSource.getRepository(Instance);
            const instance = await instanceRepo.findOne({ where: { id: exec.instanceId } });
            if (instance) {
                console.log(`\nInstância Usada: ${instance.instanceName} (Status: ${instance.status})`);
            } else {
                console.log(`\n❌ Instância ID ${exec.instanceId} NÃO EXISTE.`);
            }
        }

    } catch (error) {
        console.error('Erro de conexão:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

checkReal();
