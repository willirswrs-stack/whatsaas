import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiService } from './ai.service';
import { ElevenLabsService } from './elevenlabs.service';
import { AiController } from './ai.controller';
import { SettingsModule } from '../settings/settings.module';
import { Tenant } from '../tenants/entities/tenant.entity';

@Module({
    imports: [
        ConfigModule, 
        forwardRef(() => SettingsModule),
        TypeOrmModule.forFeature([Tenant]),
    ],
    controllers: [AiController],
    providers: [AiService, ElevenLabsService],
    exports: [AiService, ElevenLabsService],
})
export class AiModule { }
