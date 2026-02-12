import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import {
    WebhookIntegration,
    WebhookEventType,
    WebhookEventMapping,
    WebhookEventInbox,
    MessageOutbox,
    MessageLog,
} from './entities';

import { OrderWebhooksService } from './order-webhooks.service';
import { OrderWebhooksController } from './order-webhooks.controller';
import { OrderWebhooksInboundController } from './order-webhooks-inbound.controller';
import { OrderWebhooksProcessor } from './order-webhooks.processor';
import { PayloadNormalizerService } from './payload-normalizer.service';

import { EvolutionModule } from '../evolution/evolution.module';
import { MetaTemplatesModule } from '../meta-templates/meta-templates.module';
import { Instance } from '../instances/entities/instance.entity';

import { OrderWebhooksSeeder } from './order-webhooks-seeder.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            WebhookIntegration,
            WebhookEventType,
            WebhookEventMapping,
            WebhookEventInbox,
            MessageOutbox,
            MessageLog,
            Instance,
        ]),
        BullModule.registerQueue({
            name: 'order-webhooks',
            defaultJobOptions: {
                removeOnComplete: 1000,
                removeOnFail: 5000,
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            },
        }),
        EvolutionModule,
        MetaTemplatesModule,
    ],
    controllers: [
        OrderWebhooksController,
        OrderWebhooksInboundController,
    ],
    providers: [
        OrderWebhooksService,
        OrderWebhooksProcessor,
        PayloadNormalizerService,
        OrderWebhooksSeeder,
    ],
    exports: [OrderWebhooksService],
})
export class OrderWebhooksModule { }
