import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
    imports: [ConfigModule, forwardRef(() => SettingsModule)],
    controllers: [AiController],
    providers: [AiService],
    exports: [AiService],
})
export class AiModule { }
