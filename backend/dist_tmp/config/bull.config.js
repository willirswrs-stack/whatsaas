"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueDefinitions = exports.FLOW_QUEUE = exports.SCHEDULER_QUEUE = exports.RECONNECTION_QUEUE = exports.PROXY_HEALTH_QUEUE = exports.WARMUP_QUEUE = exports.DISPATCH_QUEUE = exports.BullConfig = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
exports.BullConfig = bullmq_1.BullModule.forRootAsync({
    useFactory: (configService) => {
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
    inject: [config_1.ConfigService],
});
// Queue definitions
exports.DISPATCH_QUEUE = 'dispatch-queue';
exports.WARMUP_QUEUE = 'warmup-queue';
exports.PROXY_HEALTH_QUEUE = 'proxy-health-queue';
exports.RECONNECTION_QUEUE = 'instance-reconcile-queue';
exports.SCHEDULER_QUEUE = 'scheduler-queue';
exports.FLOW_QUEUE = 'flow-queue';
exports.QueueDefinitions = bullmq_1.BullModule.registerQueue({
    name: exports.DISPATCH_QUEUE,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
    },
}, {
    name: exports.WARMUP_QUEUE,
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 60000 },
    },
}, {
    name: exports.PROXY_HEALTH_QUEUE,
    defaultJobOptions: {
        attempts: 1,
    },
}, {
    name: exports.RECONNECTION_QUEUE,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100, // Manter limpo
        removeOnFail: 500,
    },
}, {
    name: exports.SCHEDULER_QUEUE,
    defaultJobOptions: {
        attempts: 3,
        removeOnComplete: true,
    }
}, {
    name: exports.FLOW_QUEUE,
    defaultJobOptions: {
        attempts: 3,
        removeOnComplete: true,
    }
});
