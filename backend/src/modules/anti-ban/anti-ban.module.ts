import { Module, OnApplicationBootstrap, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { HumanBehaviorService } from './human-behavior.service';
import { PatternBreakerService } from './pattern-breaker.service';
import { PhoneNormalizerService } from './phone-normalizer.service';
import { DelayGeneratorService } from './delay-generator.service';
import { StackRouterService } from './stack-router.service';
import { AntiBanAnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { WarmupController } from './warmup.controller';
import { ChipHealthService } from './chip-health.service';
import { WarmupService } from './warmup.service';
import { WarmupProcessor } from './warmup.processor';
import { Instance } from '../instances/entities/instance.entity';
import { WARMUP_QUEUE } from '../../config/bull.config';
import { InstancesModule } from '../instances/instances.module';
import { AiModule } from '../ai/ai.module';
import { ChipLifecycleService } from './chip-lifecycle.service';
import { ActivePreventionService } from './active-prevention.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { GroupWarmupService } from './group-warmup.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Instance]),
        BullModule.registerQueue({
            name: WARMUP_QUEUE,
        }),
        forwardRef(() => InstancesModule),
        AiModule,
        WhatsAppModule,
    ],
    controllers: [AnalyticsController, WarmupController],
    providers: [
        HumanBehaviorService,
        PatternBreakerService,
        PhoneNormalizerService,
        DelayGeneratorService,
        StackRouterService,
        AntiBanAnalyticsService,
        ChipHealthService,
        WarmupService,
        WarmupProcessor,
        ChipLifecycleService,
        ActivePreventionService,
        GroupWarmupService,
    ],
    exports: [
        HumanBehaviorService,
        PatternBreakerService,
        PhoneNormalizerService,
        DelayGeneratorService,
        StackRouterService,
        AntiBanAnalyticsService,
        ChipHealthService,
        WarmupService,
        ChipLifecycleService,
        ActivePreventionService,
        GroupWarmupService,
    ],
})
export class AntiBanModule implements OnApplicationBootstrap {
    constructor(private readonly warmupService: WarmupService) { }

    async onApplicationBootstrap() {
        // Inicialização
    }
}
