
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { ReconnectionService } from './reconnection.service';
import { RECONNECTION_QUEUE } from '../../config/bull.config';

@Injectable()
@Processor(RECONNECTION_QUEUE)
export class ReconnectionProcessor extends WorkerHost {
    private readonly logger = new Logger(ReconnectionProcessor.name);

    constructor(
        private reconnectionService: ReconnectionService,
        private configService: ConfigService,
        @InjectQueue(RECONNECTION_QUEUE) private reconnectionQueue: Queue
    ) {
        super();
    }

    async process(job: Job): Promise<any> {
        const isEnabled = this.configService.get('AUTO_RECONNECT_ENABLED', 'true') === 'true';

        if (!isEnabled && job.name === 'trigger-check') {
            return { skipped: true, reason: 'Disabled via ENV' };
        }

        switch (job.name) {
            case 'trigger-check':
                return this.handleTriggerCheck(job);
            case 'check-instance':
                return this.handleCheckInstance(job);
            default:
                this.logger.warn(`Unknown job name: ${job.name}`);
        }
    }

    private async handleTriggerCheck(job: Job) {
        this.logger.debug('Triggering reconnection check...');
        const batchSize = this.configService.get('AUTO_RECONNECT_BATCH_SIZE', 50);

        const instances = await this.reconnectionService.findEligibleInstances(Number(batchSize));

        if (instances.length === 0) {
            return { processed: 0, message: 'No eligible instances' };
        }

        this.logger.log(`Found ${instances.length} instances for reconnection check.`);

        const jobs = instances.map(instance => ({
            name: 'check-instance',
            data: { instanceId: instance.id },
            opts: {
                jobId: `reconnect-${instance.id}-${Date.now()}`,
                removeOnComplete: true
            }
        }));

        await this.reconnectionQueue.addBulk(jobs);

        return { processed: instances.length };
    }

    private async handleCheckInstance(job: Job) {
        const { instanceId } = job.data;
        if (!instanceId) throw new Error('Missing instanceId');

        await this.reconnectionService.processInstanceById(instanceId);
    }
}
