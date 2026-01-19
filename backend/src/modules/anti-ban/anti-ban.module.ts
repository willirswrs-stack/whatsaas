import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq'; // Import BullModule
import { HumanBehaviorService } from './human-behavior.service';
import { PatternBreakerService } from './pattern-breaker.service';
import { PhoneNormalizerService } from './phone-normalizer.service';
import { DelayGeneratorService } from './delay-generator.service';
import { StackRouterService } from './stack-router.service';
import { AntiBanAnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ChipHealthService } from './chip-health.service';
import { WarmupService } from './warmup.service';
import { WarmupProcessor } from './warmup.processor'; // Import Processor
import { Instance } from '../instances/entities/instance.entity';
import { WARMUP_QUEUE } from '../../config/bull.config'; // Import Queue Name

@Module({
    imports: [
        TypeOrmModule.forFeature([Instance]),
        BullModule.registerQueue({
            name: WARMUP_QUEUE,
        }),
    ],
    controllers: [AnalyticsController],
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
    ],
})
export class AntiBanModule implements OnApplicationBootstrap {
    constructor(private readonly warmupService: WarmupService) { }

    async onApplicationBootstrap() {
        // Here we could init the scheduler if we had @nestjs/schedule
        // For now, we rely on external triggers or manual init
    }
}
