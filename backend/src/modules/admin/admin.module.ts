import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Tenant, User, SubscriptionPlan } from '../tenants/entities/tenant.entity';
import { Instance, Proxy } from '../instances/entities/instance.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Tenant, User, Instance, Proxy, Campaign, SubscriptionPlan])
    ],
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService]
})
export class AdminModule {}
