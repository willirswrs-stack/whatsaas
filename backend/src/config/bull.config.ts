import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const BullConfig = BullModule.forRootAsync({
    useFactory: (configService: ConfigService) => {
        const redisConfig = {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
        };
        console.log('🔌 [BULL-CONFIG] Connection:', redisConfig);
        return {
            connection: redisConfig,
            defaultJobOptions: {
                removeOnComplete: 1000,
                removeOnFail: 5000,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            },
        };
    },
    inject: [ConfigService],
});

// Queue definitions
export const DISPATCH_QUEUE = 'dispatch-queue';
export const WARMUP_QUEUE = 'warmup-queue';
export const PROXY_HEALTH_QUEUE = 'proxy-health-queue';
export const RECONNECTION_QUEUE = 'instance-reconcile-queue';

export const QueueDefinitions = BullModule.registerQueue(
    {
        name: DISPATCH_QUEUE,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 10000 },
        },
    },
    {
        name: WARMUP_QUEUE,
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'fixed', delay: 60000 },
        },
    },
    {
        name: PROXY_HEALTH_QUEUE,
        defaultJobOptions: {
            attempts: 1,
        },
    },
    {
        name: RECONNECTION_QUEUE,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100, // Manter limpo
            removeOnFail: 500,
        },
    },
);
