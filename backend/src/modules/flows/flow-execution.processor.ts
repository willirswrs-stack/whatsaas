import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { FlowsService } from './flows.service';
import { FLOW_QUEUE } from '../../config/bull.config';

@Processor(FLOW_QUEUE)
@Injectable()
export class FlowExecutionProcessor extends WorkerHost {
    private readonly logger = new Logger(FlowExecutionProcessor.name);

    constructor(
        @Inject(forwardRef(() => FlowsService))
        private flowsService: FlowsService,
    ) {
        super();
    }

    async process(job: Job<{ executionId: string }>) {
        const { executionId } = job.data;
        this.logger.log(`Executing flow resume for execution ${executionId}`);

        try {
            // Recomeça ou continua a execução
            await this.flowsService.resumeExecution(executionId);
        } catch (error) {
            this.logger.error(`Failed to resume flow execution ${executionId}: ${error.message}`);
            throw error;
        }
    }
}
