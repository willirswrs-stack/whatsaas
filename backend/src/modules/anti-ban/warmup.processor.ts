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
import { WarmupService } from './warmup.service';
import { WARMUP_QUEUE } from '../../config/bull.config';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';

@Processor(WARMUP_QUEUE)
@Injectable()
export class WarmupProcessor extends WorkerHost {
    private readonly logger = new Logger(WarmupProcessor.name);

    constructor(
        private readonly warmupService: WarmupService,
        private readonly whatsappFactory: WhatsAppProviderFactory,
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
        const { instanceName, toPhone, content, provider } = job.data;
        // Fallback: instâncias antigas podem não ter 'provider' salvo no banco
        const resolvedProvider = provider || 'evolution';
        this.logger.log(`💌 Sending Warmup Message: ${instanceName} -> ${toPhone} (provider: ${resolvedProvider})`);

        try {
            const client = this.whatsappFactory.getProvider(resolvedProvider);
            const result = await client.sendText(instanceName, toPhone, content);
            this.logger.log(`✅ Warmup Message Sent | instanceName=${instanceName} | to=${toPhone} | messageId=${result?.messageId}`);
            return result;
        } catch (error) {
            this.logger.error(`❌ Failed to send warmup message | instance=${instanceName} | to=${toPhone} | error=${error.message}`);
            // ⚠️ IMPORTANTE: Re-lançar o erro para que o BullMQ marque o job como FAILED
            // e aplique a política de retry. Sem isso, jobs com falha são marcados como 'completed'.
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
