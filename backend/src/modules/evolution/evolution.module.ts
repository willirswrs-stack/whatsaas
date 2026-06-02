import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvolutionApiService } from './evolution-api.service';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import { Instance } from '../instances/entities/instance.entity';
import { Campaign, CampaignContact } from '../campaigns/entities/campaign.entity';
import { FlowExecution } from '../flows/entities/flow.entity';
import { Contact } from '../contacts/entities/contact.entity';

import { EventsModule } from '../events/events.module';
import { FlowsModule } from '../flows/flows.module';
import { AntiBanModule } from '../anti-ban/anti-ban.module';
import { InboxModule } from '../inbox/inbox.module';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([Instance, CampaignContact, Campaign, FlowExecution, Contact]),
        EventsModule,
        forwardRef(() => FlowsModule),
        forwardRef(() => AntiBanModule),
        forwardRef(() => InboxModule),
    ],
    controllers: [EvolutionWebhookController],
    providers: [EvolutionApiService],
    exports: [EvolutionApiService],
})
export class EvolutionModule { }
