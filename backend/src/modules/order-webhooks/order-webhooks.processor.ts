import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MessageOutbox, MessageStatus } from './entities/message-outbox.entity';
import { MessageLog, LogDirection } from './entities/message-log.entity';
import { OrderWebhooksService } from './order-webhooks.service';
import { EvolutionApiService } from '../evolution/evolution-api.service';
import { Instance } from '../instances/entities/instance.entity';
import { MetaTemplatesService } from '../meta-templates/meta-templates.service';

interface ProcessEventJobData {
    eventId: string;
    tenantId: string;
}

interface SendMessageJobData {
    messageId: string;
    tenantId: string;
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [5000, 15000, 60000, 300000, 900000]; // 5s, 15s, 1m, 5m, 15m

@Injectable()
@Processor('order-webhooks')
export class OrderWebhooksProcessor extends WorkerHost {
    private readonly logger = new Logger(OrderWebhooksProcessor.name);

    constructor(
        @InjectRepository(MessageOutbox)
        private outboxRepo: Repository<MessageOutbox>,
        @InjectRepository(MessageLog)
        private logRepo: Repository<MessageLog>,
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        private webhooksService: OrderWebhooksService,
        private evolutionApi: EvolutionApiService,
        private metaTemplates: MetaTemplatesService,
    ) {
        super();
    }

    async process(job: Job<ProcessEventJobData | SendMessageJobData>): Promise<any> {
        const { name, data } = job;

        this.logger.debug(`Processing job: ${name} - ${JSON.stringify(data)}`);

        try {
            switch (name) {
                case 'process_event':
                    return this.processEvent(data as ProcessEventJobData);
                case 'send_message':
                    return this.sendMessage(data as SendMessageJobData);
                default:
                    this.logger.warn(`Unknown job type: ${name}`);
            }
        } catch (error) {
            this.logger.error(`Job ${name} failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async processEvent(data: ProcessEventJobData): Promise<void> {
        await this.webhooksService.processWebhookEvent(data.eventId);
    }

    private async sendMessage(data: SendMessageJobData): Promise<void> {
        const message = await this.outboxRepo.findOne({
            where: { id: data.messageId },
        });

        if (!message) {
            this.logger.error(`Message not found: ${data.messageId}`);
            return;
        }

        // Check if already sent or failed permanently
        if (message.status === MessageStatus.SENT || message.tries >= MAX_RETRIES) {
            return;
        }

        const startTime = Date.now();
        message.status = MessageStatus.SENDING;
        message.tries += 1;
        await this.outboxRepo.save(message);

        try {
            // Get instance
            const instance = await this.instanceRepo.findOne({
                where: { id: message.providerInstanceId },
            });

            if (!instance) {
                throw new Error(`Instance not found: ${message.providerInstanceId}`);
            }

            if (instance.status !== 'connected') {
                throw new Error(`Instance not connected: ${instance.instanceName}`);
            }

            let response: any;

            // Send via Evolution API (Cloud API - Template)
            if (message.templateName) {
                // For Cloud API (official), we need to use the Meta Templates service
                // to send template messages via Evolution
                response = await this.sendTemplateMessage(
                    instance,
                    message.toPhoneE164,
                    message.templateName,
                    message.templateLanguage || 'pt_BR',
                    message.templateParams || {},
                );
            } else if (message.messageText) {
                // Fallback to regular text (only works in 24h window)
                response = await this.evolutionApi.sendText(
                    instance.instanceName,
                    message.toPhoneE164,
                    message.messageText,
                );
            } else {
                throw new Error('No template or message text configured');
            }

            const duration = Date.now() - startTime;

            // Success
            message.status = MessageStatus.SENT;
            message.sentAt = new Date();
            message.providerMessageId = response?.key?.id || response?.messageId;
            message.lastError = null;
            await this.outboxRepo.save(message);

            // Log success
            await this.logRepo.save(this.logRepo.create({
                tenantId: message.tenantId,
                messageOutboxId: message.id,
                direction: LogDirection.OUTBOUND,
                providerResponse: response,
                httpStatus: 200,
                durationMs: duration,
            }));

            this.logger.log(`✅ Message sent: ${message.id} to ${message.toPhoneE164}`);

        } catch (error) {
            const duration = Date.now() - startTime;

            message.lastError = error.message;

            // Log failure
            await this.logRepo.save(this.logRepo.create({
                tenantId: message.tenantId,
                messageOutboxId: message.id,
                direction: LogDirection.OUTBOUND,
                errorDetails: error.message,
                httpStatus: error.status || 500,
                durationMs: duration,
            }));

            if (message.tries >= MAX_RETRIES) {
                message.status = MessageStatus.FAILED;
                await this.outboxRepo.save(message);
                this.logger.error(`❌ Message permanently failed: ${message.id} - ${error.message}`);
            } else {
                message.status = MessageStatus.RETRYING;
                message.nextRetryAt = new Date(Date.now() + RETRY_DELAYS[message.tries - 1]);
                await this.outboxRepo.save(message);

                // Re-throw to trigger BullMQ retry with backoff
                throw error;
            }
        }
    }

    private async sendTemplateMessage(
        instance: Instance,
        phone: string,
        templateName: string,
        templateLanguage: string,
        params: Record<string, any>,
    ): Promise<any> {
        // Format phone for WhatsApp (remove non-digits)
        const formattedPhone = phone.replace(/\D/g, '');

        // Build template message for Evolution API (Cloud API)
        // Evolution API endpoint for template: POST /message/sendTemplate/{instance}
        const templatePayload = {
            number: formattedPhone,
            name: templateName,
            language: templateLanguage,
            components: this.buildTemplateComponents(params),
        };

        // Use Evolution API to send template
        const baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
        const apiKey = process.env.EVOLUTION_API_KEY || '';

        const response = await fetch(
            `${baseUrl}/message/sendTemplate/${instance.instanceName}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey,
                },
                body: JSON.stringify(templatePayload),
            },
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    private buildTemplateComponents(params: Record<string, any>): any[] {
        // Convert numbered params to WhatsApp template component format
        // Example: { "1": "João", "2": "12345" } -> body parameters
        const bodyParams = Object.entries(params)
            .filter(([key]) => !isNaN(Number(key)))
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([, value]) => ({ type: 'text', text: String(value) }));

        if (bodyParams.length === 0) {
            return [];
        }

        return [
            {
                type: 'body',
                parameters: bodyParams,
            },
        ];
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job) {
        this.logger.debug(`Job ${job.name} completed: ${job.id}`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        this.logger.error(`Job ${job.name} failed: ${job.id} - ${error.message}`);
    }
}
