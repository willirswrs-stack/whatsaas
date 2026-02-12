import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Instance, Proxy, WarmupSchedule } from './entities/instance.entity';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';
import { EvolutionModule } from '../evolution/evolution.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Instance, Proxy, WarmupSchedule]),
        forwardRef(() => EvolutionModule),
    ],
    controllers: [InstancesController],
    providers: [InstancesService],
    exports: [InstancesService],
})
export class InstancesModule { }

