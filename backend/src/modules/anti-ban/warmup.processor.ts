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

@Processor(WARMUP_QUEUE)
@Injectable()
export class WarmupProcessor extends WorkerHost {
    private readonly logger = new Logger(WarmupProcessor.name);

    constructor(
        private readonly warmupService: WarmupService,
    ) {
        super();
    }

    async process(job: Job): Promise<any> {
        this.logger.log(`🔥 Processing Warmup Job: ${job.name}`);

        switch (job.name) {
            case 'daily-warmup-routine':
                return this.handleDailyWarmup(job);

            // Future: case 'generate-warmup-conversation':

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

    @OnWorkerEvent('completed')
    onCompleted(job: Job) {
        this.logger.debug(`Job ${job.id} has completed!`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job) {
        this.logger.error(`Job ${job.id} has failed: ${job.failedReason}`);
    }
}
