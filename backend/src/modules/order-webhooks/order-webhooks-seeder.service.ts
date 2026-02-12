import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookEventType, DEFAULT_EVENT_TYPES } from './entities/webhook-event-type.entity';

@Injectable()
export class OrderWebhooksSeeder implements OnModuleInit {
    private readonly logger = new Logger(OrderWebhooksSeeder.name);

    constructor(
        @InjectRepository(WebhookEventType)
        private eventTypeRepo: Repository<WebhookEventType>,
    ) { }

    async onModuleInit() {
        // Auto-seed event types on module initialization
        await this.seedEventTypes();
    }

    async seedEventTypes(): Promise<void> {
        try {
            let created = 0;
            for (const eventData of DEFAULT_EVENT_TYPES) {
                const existing = await this.eventTypeRepo.findOne({
                    where: { code: eventData.code },
                });

                if (!existing) {
                    await this.eventTypeRepo.save(
                        this.eventTypeRepo.create(eventData),
                    );
                    created++;
                    this.logger.debug(`Created event type: ${eventData.code}`);
                }
            }

            if (created > 0) {
                this.logger.log(`✅ Seeded ${created} event types`);
            } else {
                this.logger.debug('Event types already exist');
            }
        } catch (error) {
            this.logger.error(`Failed to seed event types: ${error.message}`);
        }
    }
}
