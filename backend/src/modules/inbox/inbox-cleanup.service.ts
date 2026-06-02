import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InboxService } from './inbox.service';

/**
 * Runs daily at 03:00 AM to delete messages older than 90 days.
 */
@Injectable()
export class InboxCleanupService {
    private readonly logger = new Logger(InboxCleanupService.name);

    constructor(private readonly inboxService: InboxService) {}

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async handleDailyCleanup() {
        this.logger.log('🗑️ Running daily inbox cleanup (90-day retention)...');
        const deleted = await this.inboxService.cleanupExpiredMessages();
        this.logger.log(`✅ Inbox cleanup complete: ${deleted} messages removed`);
    }
}
