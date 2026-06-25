import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Instance, WarmupSchedule } from './entities/instance.entity';
import { ChipDetail } from './entities/chip-detail.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';
import { EvolutionModule } from '../evolution/evolution.module';
import { ChipHealthService } from '../anti-ban/chip-health.service';

import { AndroidService } from './services/android.service';
import { ReconnectionService } from './services/reconnection.service';
import { MobileFarmController } from './mobile-farm.controller';
import { ProxiesModule } from '../proxies/proxies.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Instance, WarmupSchedule, ChipDetail, Tenant]),
        forwardRef(() => EvolutionModule),
        ProxiesModule,
    ],
    controllers: [InstancesController, MobileFarmController],
    providers: [InstancesService, ChipHealthService, AndroidService, ReconnectionService],
    exports: [InstancesService, AndroidService, ReconnectionService],
})
export class InstancesModule { }

