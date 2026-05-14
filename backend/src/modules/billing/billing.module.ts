import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AsaasService } from './asaas.service';
import { BillingController } from './billing.controller';
import { Tenant, SubscriptionPlan } from '../tenants/entities/tenant.entity';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([Tenant, SubscriptionPlan])
    ],
    controllers: [BillingController],
    providers: [AsaasService],
    exports: [AsaasService]
})
export class BillingModule {}
