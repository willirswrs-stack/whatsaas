import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaTemplatesController } from './meta-templates.controller';
import { MetaWebhookController } from './meta-webhook.controller';
import { MetaTemplatesService } from './meta-templates.service';
import { MetaGraphApiService } from './meta-graph-api.service';
import { Campaign, CampaignContact } from '../campaigns/entities/campaign.entity';
import { Instance } from '../instances/entities/instance.entity';
import { FlowExecution } from '../flows/entities/flow.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { EventsModule } from '../events/events.module';
import { FlowsModule } from '../flows/flows.module';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
    imports: [
        ConfigModule,
        CryptoModule,
        TypeOrmModule.forFeature([Campaign, CampaignContact, Instance, FlowExecution, Contact]),
        EventsModule,
        forwardRef(() => FlowsModule),
    ],
    controllers: [MetaTemplatesController, MetaWebhookController],
    providers: [MetaTemplatesService, MetaGraphApiService],
    exports: [MetaTemplatesService, MetaGraphApiService],
})
export class MetaTemplatesModule { }
