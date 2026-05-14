import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Instance, Proxy, WarmupSchedule } from './entities/instance.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';
import { EvolutionModule } from '../evolution/evolution.module';
import { ChipHealthService } from '../anti-ban/chip-health.service';

import { AndroidService } from './services/android.service';
import { MobileFarmController } from './mobile-farm.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Instance, Proxy, WarmupSchedule, Tenant]),
        forwardRef(() => EvolutionModule),
    ],
    controllers: [InstancesController, MobileFarmController],
    providers: [InstancesService, ChipHealthService, AndroidService],
    exports: [InstancesService, AndroidService],
})
export class InstancesModule { }

