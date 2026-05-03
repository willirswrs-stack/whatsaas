import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Instance, Proxy, WarmupSchedule } from './entities/instance.entity';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';
import { EvolutionModule } from '../evolution/evolution.module';
import { ChipHealthService } from '../anti-ban/chip-health.service';

import { AndroidService } from './services/android.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Instance, Proxy, WarmupSchedule]),
        forwardRef(() => EvolutionModule),
    ],
    controllers: [InstancesController],
    providers: [InstancesService, ChipHealthService, AndroidService],
    exports: [InstancesService, AndroidService],
})
export class InstancesModule { }

