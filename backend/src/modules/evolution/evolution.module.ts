import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvolutionApiService } from './evolution-api.service';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import { Instance } from '../instances/entities/instance.entity';
import { Campaign, CampaignContact } from '../campaigns/entities/campaign.entity';

import { EventsModule } from '../events/events.module';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([Instance, CampaignContact, Campaign]),
        EventsModule,
    ],
    controllers: [EvolutionWebhookController],
    providers: [EvolutionApiService],
    exports: [EvolutionApiService],
})
export class EvolutionModule { }
