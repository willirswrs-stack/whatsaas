import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import {
    Campaign,
    CampaignContact,
    MessageVariation,
    Template,
} from './entities/campaign.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { ContactsModule } from '../contacts/contacts.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { AiModule } from '../ai/ai.module';
import { DispatcherModule } from '../dispatcher/dispatcher.module';
import { SettingsModule } from '../settings/settings.module';
import { SCHEDULER_QUEUE } from '../../config/bull.config';
import { CampaignSchedulerProcessor } from './campaign-scheduler.processor';
import { Flow } from '../flows/entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Campaign,
            CampaignContact,
            MessageVariation,
            Contact,
            Template,
            Flow,
        ]),
        BullModule.registerQueue({
            name: SCHEDULER_QUEUE,
        }),
        AiModule,
        DispatcherModule,
        forwardRef(() => SettingsModule),
        ContactsModule,
    ],
    controllers: [CampaignsController],
    providers: [CampaignsService, CampaignSchedulerProcessor],
    exports: [CampaignsService],
})
export class CampaignsModule { }
