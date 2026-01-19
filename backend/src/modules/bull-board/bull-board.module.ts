
import { Module, MiddlewareConsumer, NestModule, Logger } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { DISPATCH_QUEUE, WARMUP_QUEUE, PROXY_HEALTH_QUEUE, RECONNECTION_QUEUE } from '../../config/bull.config';

@Module({
    imports: [
        BullModule.registerQueue(
            { name: DISPATCH_QUEUE },
            { name: WARMUP_QUEUE },
            { name: PROXY_HEALTH_QUEUE },
            { name: RECONNECTION_QUEUE }
        ),
    ],
})
export class BullBoardModule implements NestModule {
    private readonly logger = new Logger(BullBoardModule.name);

    constructor(
        @InjectQueue(DISPATCH_QUEUE) private dispatchQueue: Queue,
        @InjectQueue(WARMUP_QUEUE) private warmupQueue: Queue,
        @InjectQueue(PROXY_HEALTH_QUEUE) private proxyQueue: Queue,
        @InjectQueue(RECONNECTION_QUEUE) private reconnectionQueue: Queue,
    ) { }

    configure(consumer: MiddlewareConsumer) {
        const serverAdapter = new ExpressAdapter();
        const path = '/queues';
        serverAdapter.setBasePath(`/api/v1${path}`);

        createBullBoard({
            queues: [
                new BullMQAdapter(this.dispatchQueue),
                new BullMQAdapter(this.warmupQueue),
                new BullMQAdapter(this.proxyQueue),
                new BullMQAdapter(this.reconnectionQueue),
            ],
            serverAdapter,
        });

        this.logger.log(`Bull Board initialized at /api/v1${path}`);

        consumer
            .apply(serverAdapter.getRouter())
            .forRoutes(path);
    }
}
