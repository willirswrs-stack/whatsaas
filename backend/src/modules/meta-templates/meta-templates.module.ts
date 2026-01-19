import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetaTemplatesController } from './meta-templates.controller';
import { MetaTemplatesService } from './meta-templates.service';
import { MetaGraphApiService } from './meta-graph-api.service';

@Module({
    imports: [ConfigModule],
    controllers: [MetaTemplatesController],
    providers: [MetaTemplatesService, MetaGraphApiService],
    exports: [MetaTemplatesService],
})
export class MetaTemplatesModule { }
