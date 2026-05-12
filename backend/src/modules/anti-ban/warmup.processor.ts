/**
 * WarmupProcessor - Job Processor for Warmup Tasks
 * 
 * Handles background jobs related to instance warmup:
 * 1. Daily warmup advancement (scheduled)
 * 2. Warmup conversation generation (future)
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instance } from '../instances/entities/instance.entity';
import { WarmupService } from './warmup.service';
import { WARMUP_QUEUE } from '../../config/bull.config';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { HumanBehaviorService } from './human-behavior.service';
import { ActivePreventionService } from './active-prevention.service';

@Processor(WARMUP_QUEUE)
@Injectable()
export class WarmupProcessor extends WorkerHost {
    private readonly logger = new Logger(WarmupProcessor.name);

    constructor(
        private readonly warmupService: WarmupService,
        private readonly whatsappFactory: WhatsAppProviderFactory,
        private readonly humanBehavior: HumanBehaviorService,
        private readonly activePrevention: ActivePreventionService,
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
    ) {
        super();
    }

    async process(job: Job): Promise<any> {
        this.logger.log(`🔥 Processing Warmup Job: ${job.name}`);

        switch (job.name) {
            case 'daily-warmup-routine':
                return this.handleDailyWarmup(job);

            case 'execute-warmup-message':
                return this.handleWarmupMessage(job);

            default:
                this.logger.warn(`Unknown job name: ${job.name}`);
        }
    }

    private async handleDailyWarmup(job: Job): Promise<any> {
        this.logger.log('📅 Starting Daily Warmup Routine check...');
        try {
            const result = await this.warmupService.executeDailyWarmupRoutine();
            this.logger.log(`✅ Daily Warmup Completed: ${JSON.stringify(result)}`);
            return result;
        } catch (error) {
            this.logger.error(`❌ Warmup Routine Failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async handleWarmupMessage(job: Job): Promise<any> {
        const { instanceId, instanceName, toPhone, content, provider } = job.data;
        const resolvedProvider = provider || 'evolution';
        this.logger.log(`💌 Sending Warmup Message: ${instanceName} -> ${toPhone} (provider: ${resolvedProvider})`);

        try {
            const client = this.whatsappFactory.getProvider(resolvedProvider);

            // --- [PREVENÇÃO ATIVA] ---
            // 1. Simular comportamento humano (Presença/Digitação)
            const timing = this.humanBehavior.generateTimingMetadata(content);
            this.logger.log(`🎭 [Prevenção] ${instanceName} digitando por ${timing.typingDurationMs}ms...`);
            
            await client.sendPresence(instanceName, toPhone, 'composing', timing.typingDurationMs);

            // 2. Aplicar Telemetria de Hardware (Bateria/Movimento)
            await this.activePrevention.applyPrevention(instanceId);

            // 3. Enviar a mensagem após a simulação
            const result = await client.sendText(instanceName, toPhone, content);
            
            if (instanceId) {
                await this.instanceRepo.increment({ id: instanceId }, 'dailySent', 1).catch(err => {
                    this.logger.warn(`Failed to increment dailySent for instance ${instanceId}: ${err.message}`);
                });
            }

            this.logger.log(`✅ Warmup Message Sent with Active Protection | instanceName=${instanceName} | to=${toPhone}`);
            return result;
        } catch (error) {
            this.logger.error(`❌ Failed to send warmup message | instance=${instanceName} | to=${toPhone} | error=${error.message}`);
            throw error;
        }
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job) {
        this.logger.debug(`Job ${job.id} has completed!`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job) {
        this.logger.error(`Job ${job.id} has failed: ${job.failedReason}`);
    }
}
