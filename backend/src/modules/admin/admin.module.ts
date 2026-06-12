import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Tenant, User, SubscriptionPlan } from '../tenants/entities/tenant.entity';
import { Instance } from '../instances/entities/instance.entity';
import { ProxyEntity } from '../proxies/entities/proxy.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';

import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Tenant, User, Instance, ProxyEntity, Campaign, SubscriptionPlan]),
        AuthModule
    ],
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService]
})
export class AdminModule {}
