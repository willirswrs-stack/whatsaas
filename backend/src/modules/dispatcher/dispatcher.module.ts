import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { DispatcherProcessor } from './dispatcher.processor';
import { DispatcherService } from './dispatcher.service';
import { Instance, Proxy, WarmupSchedule } from '../instances/entities/instance.entity';
import { Campaign, CampaignContact, MessageVariation, Contact } from '../campaigns/entities/campaign.entity';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { DISPATCH_QUEUE } from '../../config/bull.config';

// Anti-Ban Module
import { AntiBanModule } from '../anti-ban/anti-ban.module';
import { FlowsModule } from '../flows/flows.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Instance,
            Proxy,
            Campaign,
            CampaignContact,
            MessageVariation,
            Contact,
        ]),
        BullModule.registerQueue({
            name: DISPATCH_QUEUE,
        }),
        WhatsAppModule,
        AntiBanModule, // HBS, Pattern Breaker, Delay Generator
        FlowsModule,
    ],
    providers: [DispatcherProcessor, DispatcherService],
    exports: [DispatcherService],
})
export class DispatcherModule { }
