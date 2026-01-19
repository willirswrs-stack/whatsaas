
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

import { ReconnectionService } from './reconnection.service';
import { ReconnectionProcessor } from './reconnection.processor';
import { ReconnectionController } from './reconnection.controller';
import { Instance } from '../instances/entities/instance.entity';
import { RECONNECTION_QUEUE } from '../../config/bull.config';

@Module({
    imports: [
        TypeOrmModule.forFeature([Instance]),
        BullModule.registerQueue({
            name: RECONNECTION_QUEUE,
        }),
    ],
    controllers: [ReconnectionController],
    providers: [ReconnectionService, ReconnectionProcessor],
    exports: [ReconnectionService],
})
export class ReconnectionModule implements OnModuleInit {
    constructor(
        @InjectQueue(RECONNECTION_QUEUE) private reconnectionQueue: Queue,
        private configService: ConfigService,
    ) { }

    async onModuleInit() {
        // Setup Repeatable Job
        const intervalMinutes = this.configService.get('AUTO_RECONNECT_INTERVAL_MINUTES', 5);
        const intervalMs = intervalMinutes * 60 * 1000;

        // Limpa jobs antigos se precisar reconfigurar (opcional mas bom em dev)
        // Como o ID é fixo, deve dar override ou ignorar.
        // O melhor é remover todos com esse ID e adicionar de novo.
        const jobId = 'reconnection-batch-trigger';

        await this.reconnectionQueue.removeRepeatable(
            'trigger-check',
            { every: intervalMs, jobId },
        ).catch(() => { }); // Ignora erro se não existir

        // Add new
        await this.reconnectionQueue.add(
            'trigger-check',
            {},
            {
                repeat: {
                    every: intervalMs,
                },
                jobId,
            }
        );

        console.log(`[ReconnectionModule] Scheduled reconciliation every ${intervalMinutes} minutes.`);
    }
}
