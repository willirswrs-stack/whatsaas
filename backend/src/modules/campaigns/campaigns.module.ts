import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
    Campaign,
    CampaignContact,
    MessageVariation,
    Contact,
    Template,
} from './entities/campaign.entity';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { AiModule } from '../ai/ai.module';
import { DispatcherModule } from '../dispatcher/dispatcher.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Campaign,
            CampaignContact,
            MessageVariation,
            Contact,
            Template,
        ]),
        AiModule,
        DispatcherModule,
        forwardRef(() => SettingsModule),
    ],
    controllers: [CampaignsController],
    providers: [CampaignsService],
    exports: [CampaignsService],
})
export class CampaignsModule { }
