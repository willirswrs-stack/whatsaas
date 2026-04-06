import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { SCHEDULER_QUEUE } from '../../config/bull.config';

export interface ScheduleJobData {
    campaignId: string;
    tenantId: string;
}

@Processor(SCHEDULER_QUEUE)
@Injectable()
export class CampaignSchedulerProcessor extends WorkerHost {
    private readonly logger = new Logger(CampaignSchedulerProcessor.name);

    constructor(
        // Use forwardRef if circular dependency occurs (CampaignsService injects SchedulerQueue)
        @Inject(forwardRef(() => CampaignsService))
        private campaignsService: CampaignsService,
    ) {
        super();
    }

    async process(job: Job<ScheduleJobData>): Promise<any> {
        const { campaignId, tenantId } = job.data;
        this.logger.log(`⏰ Executing scheduled start for campaign ${campaignId}`);

        try {
            await this.campaignsService.start(campaignId, tenantId);
            this.logger.log(`✅ Scheduled campaign ${campaignId} started successfully`);
        } catch (error) {
            this.logger.error(`❌ Failed to start scheduled campaign ${campaignId}: ${error.message}`);
            throw error;
        }
    }
}
