import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, randomBytes, createHmac } from 'crypto';

import {
    WebhookIntegration,
    WebhookProvider,
    SignatureType,
} from './entities/webhook-integration.entity';
import { WebhookEventType, DEFAULT_EVENT_TYPES } from './entities/webhook-event-type.entity';
import { WebhookEventMapping, SendMode } from './entities/webhook-event-mapping.entity';
import { WebhookEventInbox, ProcessedStatus } from './entities/webhook-event-inbox.entity';
import { MessageOutbox, MessageStatus, MessageProvider } from './entities/message-outbox.entity';
import { MessageLog, LogDirection } from './entities/message-log.entity';

import {
    CreateWebhookIntegrationDto,
    UpdateWebhookIntegrationDto,
    CreateEventMappingDto,
    UpdateEventMappingDto,
} from './dto';

import { PayloadNormalizerService, NormalizedPayload } from './payload-normalizer.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrderWebhooksService {
    private readonly logger = new Logger(OrderWebhooksService.name);

    constructor(
        @InjectRepository(WebhookIntegration)
        private integrationRepo: Repository<WebhookIntegration>,
        @InjectRepository(WebhookEventType)
        private eventTypeRepo: Repository<WebhookEventType>,
        @InjectRepository(WebhookEventMapping)
        private mappingRepo: Repository<WebhookEventMapping>,
        @InjectRepository(WebhookEventInbox)
        private inboxRepo: Repository<WebhookEventInbox>,
        @InjectRepository(MessageOutbox)
        private outboxRepo: Repository<MessageOutbox>,
        @InjectRepository(MessageLog)
        private logRepo: Repository<MessageLog>,
        @InjectQueue('order-webhooks')
        private webhookQueue: Queue,
        private normalizer: PayloadNormalizerService,
        private configService: ConfigService,
    ) { }

    // ===================== Integration CRUD =====================

    async createIntegration(
        tenantId: string,
        dto: CreateWebhookIntegrationDto,
    ): Promise<WebhookIntegration> {
        // Generate secret if not provided
        const inboundSecret = dto.inboundSecret || this.generateSecret();

        // Generate slug if not provided
        let endpointSlug = dto.endpointSlug || this.generateSlug(dto.name);

        // Check for duplicate slug
        const existing = await this.integrationRepo.findOne({
            where: { tenantId, endpointSlug },
        });
        if (existing) {
            endpointSlug = `${endpointSlug}-${randomBytes(4).toString('hex')}`;
        }

        const integration = this.integrationRepo.create({
            tenantId,
            ...dto,
            inboundSecret,
            endpointSlug,
        });

        return this.integrationRepo.save(integration);
    }

    async findAllIntegrations(tenantId: string): Promise<WebhookIntegration[]> {
        return this.integrationRepo.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    async findIntegration(tenantId: string, id: string): Promise<WebhookIntegration> {
        const integration = await this.integrationRepo.findOne({
            where: { id, tenantId },
        });
        if (!integration) {
            throw new NotFoundException('Integration not found');
        }
        return integration;
    }

    async updateIntegration(
        tenantId: string,
        id: string,
        dto: UpdateWebhookIntegrationDto,
    ): Promise<WebhookIntegration> {
        const integration = await this.findIntegration(tenantId, id);

        // Check slug uniqueness if changing
        if (dto.endpointSlug && dto.endpointSlug !== integration.endpointSlug) {
            const existing = await this.integrationRepo.findOne({
                where: { tenantId, endpointSlug: dto.endpointSlug },
            });
            if (existing && existing.id !== id) {
                throw new ConflictException('Endpoint slug already in use');
            }
        }

        Object.assign(integration, dto);
        return this.integrationRepo.save(integration);
    }

    async deleteIntegration(tenantId: string, id: string): Promise<void> {
        const integration = await this.findIntegration(tenantId, id);
        await this.integrationRepo.remove(integration);
    }

    async regenerateSecret(tenantId: string, id: string): Promise<string> {
        const integration = await this.findIntegration(tenantId, id);
        const newSecret = this.generateSecret();
        integration.inboundSecret = newSecret;
        await this.integrationRepo.save(integration);
        return newSecret;
    }

    // ===================== Event Types =====================

    async findAllEventTypes(): Promise<WebhookEventType[]> {
        return this.eventTypeRepo.find({
            where: { isActive: true },
            order: { code: 'ASC' },
        });
    }

    async seedEventTypes(): Promise<void> {
        for (const eventData of DEFAULT_EVENT_TYPES) {
            const existing = await this.eventTypeRepo.findOne({
                where: { code: eventData.code },
            });
            if (!existing) {
                await this.eventTypeRepo.save(this.eventTypeRepo.create(eventData));
            }
        }
        this.logger.log('Event types seeded');
    }

    // ===================== Event Mappings CRUD =====================

    async createMapping(
        tenantId: string,
        dto: CreateEventMappingDto,
    ): Promise<WebhookEventMapping> {
        // Validate integration belongs to tenant
        await this.findIntegration(tenantId, dto.integrationId);

        // Check event type exists
        const eventType = await this.eventTypeRepo.findOne({
            where: { code: dto.eventTypeCode },
        });
        if (!eventType) {
            throw new BadRequestException(`Event type '${dto.eventTypeCode}' not found`);
        }

        const mapping = this.mappingRepo.create({
            tenantId,
            ...dto,
        });

        return this.mappingRepo.save(mapping);
    }

    async findAllMappings(
        tenantId: string,
        integrationId?: string,
    ): Promise<WebhookEventMapping[]> {
        const query: any = { tenantId };
        if (integrationId) {
            query.integrationId = integrationId;
        }

        return this.mappingRepo.find({
            where: query,
            relations: ['integration'],
            order: { eventTypeCode: 'ASC' },
        });
    }

    async findMapping(tenantId: string, id: string): Promise<WebhookEventMapping> {
        const mapping = await this.mappingRepo.findOne({
            where: { id, tenantId },
            relations: ['integration'],
        });
        if (!mapping) {
            throw new NotFoundException('Event mapping not found');
        }
        return mapping;
    }

    async updateMapping(
        tenantId: string,
        id: string,
        dto: UpdateEventMappingDto,
    ): Promise<WebhookEventMapping> {
        const mapping = await this.findMapping(tenantId, id);
        Object.assign(mapping, dto);
        return this.mappingRepo.save(mapping);
    }

    async deleteMapping(tenantId: string, id: string): Promise<void> {
        const mapping = await this.findMapping(tenantId, id);
        await this.mappingRepo.remove(mapping);
    }

    // ===================== Inbox (Monitoring) =====================

    async findInboxEvents(
        tenantId: string,
        filters: {
            integrationId?: string;
            eventTypeCode?: string;
            status?: ProcessedStatus;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        },
    ): Promise<{ data: WebhookEventInbox[]; total: number }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const qb = this.inboxRepo.createQueryBuilder('inbox')
            .where('inbox.tenantId = :tenantId', { tenantId })
            .orderBy('inbox.receivedAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (filters.integrationId) {
            qb.andWhere('inbox.integrationId = :integrationId', {
                integrationId: filters.integrationId,
            });
        }
        if (filters.eventTypeCode) {
            qb.andWhere('inbox.eventTypeCode = :eventTypeCode', {
                eventTypeCode: filters.eventTypeCode,
            });
        }
        if (filters.status) {
            qb.andWhere('inbox.processedStatus = :status', { status: filters.status });
        }
        if (filters.startDate) {
            qb.andWhere('inbox.receivedAt >= :startDate', { startDate: filters.startDate });
        }
        if (filters.endDate) {
            qb.andWhere('inbox.receivedAt <= :endDate', { endDate: filters.endDate });
        }

        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }

    async findInboxEvent(tenantId: string, id: string): Promise<WebhookEventInbox> {
        const inbox = await this.inboxRepo.findOne({
            where: { id, tenantId },
            relations: ['messages'],
        });
        if (!inbox) {
            throw new NotFoundException('Event not found');
        }
        return inbox;
    }

    // ===================== Outbox (Monitoring) =====================

    async findOutboxMessages(
        tenantId: string,
        filters: {
            status?: MessageStatus;
            phone?: string;
            orderId?: string;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        },
    ): Promise<{ data: MessageOutbox[]; total: number }> {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const qb = this.outboxRepo.createQueryBuilder('outbox')
            .where('outbox.tenantId = :tenantId', { tenantId })
            .orderBy('outbox.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (filters.status) {
            qb.andWhere('outbox.status = :status', { status: filters.status });
        }
        if (filters.phone) {
            qb.andWhere('outbox.toPhoneE164 LIKE :phone', { phone: `%${filters.phone}%` });
        }
        if (filters.orderId) {
            qb.andWhere('outbox.orderId LIKE :orderId', { orderId: `%${filters.orderId}%` });
        }
        if (filters.startDate) {
            qb.andWhere('outbox.createdAt >= :startDate', { startDate: filters.startDate });
        }
        if (filters.endDate) {
            qb.andWhere('outbox.createdAt <= :endDate', { endDate: filters.endDate });
        }

        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }

    async retryMessage(tenantId: string, id: string): Promise<MessageOutbox> {
        const message = await this.outboxRepo.findOne({
            where: { id, tenantId },
        });
        if (!message) {
            throw new NotFoundException('Message not found');
        }
        if (message.status !== MessageStatus.FAILED) {
            throw new BadRequestException('Only failed messages can be retried');
        }

        message.status = MessageStatus.QUEUED;
        message.tries = 0;
        message.lastError = null;
        await this.outboxRepo.save(message);

        await this.webhookQueue.add('send_message', {
            messageId: message.id,
            tenantId,
        });

        return message;
    }

    // ===================== Webhook Processing =====================

    async handleInboundWebhook(
        tenantSlug: string,
        endpointSlug: string,
        payload: Record<string, any>,
        headers: Record<string, string>,
        rawBody: string,
    ): Promise<{ received: boolean; eventId?: string }> {
        // Find integration by slugs (need to join with tenant)
        const integration = await this.integrationRepo
            .createQueryBuilder('i')
            .innerJoin('tenants', 't', 't.id = i.tenant_id')
            .where('t.slug = :tenantSlug', { tenantSlug })
            .andWhere('i.endpoint_slug = :endpointSlug', { endpointSlug })
            .andWhere('i.is_enabled = true')
            .getOne();

        if (!integration) {
            this.logger.warn(`Integration not found: ${tenantSlug}/${endpointSlug}`);
            throw new NotFoundException('Integration not found or disabled');
        }

        // Validate signature
        const isValid = this.validateSignature(integration, headers, rawBody);
        if (!isValid) {
            this.logger.warn(`Invalid signature for integration ${integration.id}`);
            throw new BadRequestException('Invalid signature');
        }

        // Detect event type
        const eventTypeCode = this.normalizer.detectEventType(
            integration.provider,
            payload,
        );

        // Create event hash for idempotency
        const eventHash = this.createEventHash(
            integration.id,
            payload,
            eventTypeCode,
        );

        // Check for duplicate
        const existing = await this.inboxRepo.findOne({
            where: { eventHash },
        });
        if (existing) {
            this.logger.debug(`Duplicate event ignored: ${eventHash}`);
            return { received: true, eventId: existing.id };
        }

        // Normalize payload
        const normalizedData = this.normalizer.normalize(
            integration.provider,
            payload,
            eventTypeCode,
        );

        // Create inbox entry
        const inboxEvent = this.inboxRepo.create({
            tenantId: integration.tenantId,
            integrationId: integration.id,
            providerEventId: payload.id?.toString() || null,
            eventTypeCode,
            eventHash,
            occurredAt: normalizedData.occurredAt,
            payloadRaw: payload,
            normalizedData,
            processedStatus: ProcessedStatus.PENDING,
            processingLog: [{
                timestamp: new Date().toISOString(),
                action: 'received',
                details: { provider: integration.provider },
            }],
        });

        await this.inboxRepo.save(inboxEvent);

        // Enqueue processing job
        await this.webhookQueue.add('process_event', {
            eventId: inboxEvent.id,
            tenantId: integration.tenantId,
        });

        this.logger.log(`Event received: ${eventTypeCode} for tenant ${integration.tenantId}`);

        return { received: true, eventId: inboxEvent.id };
    }

    async processWebhookEvent(eventId: string): Promise<void> {
        const event = await this.inboxRepo.findOne({
            where: { id: eventId },
            relations: ['integration'],
        });

        if (!event) {
            this.logger.error(`Event not found: ${eventId}`);
            return;
        }

        try {
            // Find enabled mappings for this event type
            const mappings = await this.mappingRepo.find({
                where: {
                    tenantId: event.tenantId,
                    integrationId: event.integrationId,
                    eventTypeCode: event.eventTypeCode,
                    isEnabled: true,
                },
            });

            if (mappings.length === 0) {
                event.processedStatus = ProcessedStatus.IGNORED;
                event.processedAt = new Date();
                event.processingLog.push({
                    timestamp: new Date().toISOString(),
                    action: 'ignored',
                    details: { reason: 'No enabled mappings found' },
                });
                await this.inboxRepo.save(event);
                return;
            }

            const normalizedData = event.normalizedData as NormalizedPayload;

            // Validate phone
            if (!normalizedData.phoneE164 || normalizedData.phoneE164.length < 10) {
                event.processedStatus = ProcessedStatus.FAILED;
                event.processedAt = new Date();
                event.errorMessage = 'Invalid or missing phone number';
                event.processingLog.push({
                    timestamp: new Date().toISOString(),
                    action: 'failed',
                    details: { reason: 'Invalid phone', phone: normalizedData.phoneE164 },
                });
                await this.inboxRepo.save(event);
                return;
            }

            // Process each matching mapping
            for (const mapping of mappings) {
                // Check match rules
                if (!this.evaluateMatchRules(mapping.matchRules, event.payloadRaw, normalizedData)) {
                    event.processingLog.push({
                        timestamp: new Date().toISOString(),
                        action: 'mapping_skipped',
                        details: { mappingId: mapping.id, reason: 'Match rules not satisfied' },
                    });
                    continue;
                }

                // Build template params
                const templateParams = this.buildTemplateParams(
                    mapping.templateVariablesMap,
                    event.payloadRaw,
                    normalizedData,
                );

                // Create outbox message
                const message = this.outboxRepo.create({
                    tenantId: event.tenantId,
                    sourceEventId: event.id,
                    toPhoneE164: normalizedData.phoneE164,
                    customerName: normalizedData.customerName,
                    orderId: normalizedData.orderId,
                    templateName: mapping.templateName,
                    templateLanguage: mapping.templateLanguage,
                    templateParams,
                    messageText: mapping.fallbackText,
                    provider: MessageProvider.EVOLUTION_CLOUD,
                    providerInstanceId: mapping.whatsappInstanceId,
                    status: MessageStatus.QUEUED,
                });

                await this.outboxRepo.save(message);

                // Enqueue send job
                await this.webhookQueue.add('send_message', {
                    messageId: message.id,
                    tenantId: event.tenantId,
                });

                event.processingLog.push({
                    timestamp: new Date().toISOString(),
                    action: 'message_created',
                    details: { messageId: message.id, mappingId: mapping.id },
                });

                // Forward to n8n if enabled
                if (mapping.forwardToN8n && mapping.n8nWebhookUrl) {
                    this.forwardToN8n(mapping.n8nWebhookUrl, event, normalizedData).catch(err => {
                        this.logger.error(`n8n forward failed: ${err.message}`);
                    });
                }
            }

            event.processedStatus = ProcessedStatus.PROCESSED;
            event.processedAt = new Date();
            await this.inboxRepo.save(event);

        } catch (error) {
            event.processedStatus = ProcessedStatus.FAILED;
            event.processedAt = new Date();
            event.errorMessage = error.message;
            event.processingLog.push({
                timestamp: new Date().toISOString(),
                action: 'error',
                details: { error: error.message },
            });
            await this.inboxRepo.save(event);
            throw error;
        }
    }

    // ===================== Helpers =====================

    private generateSecret(): string {
        return randomBytes(32).toString('hex');
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);
    }

    private validateSignature(
        integration: WebhookIntegration,
        headers: Record<string, string>,
        rawBody: string,
    ): boolean {
        switch (integration.signatureType) {
            case SignatureType.NONE:
                return true;

            case SignatureType.TOKEN_HEADER:
                const headerValue = headers[integration.signatureHeader?.toLowerCase() || ''];
                return headerValue === integration.inboundSecret;

            case SignatureType.HMAC_SHA256:
                const signature = headers[integration.signatureHeader?.toLowerCase() || 'x-signature'];
                if (!signature) return false;

                const expectedSig = createHmac('sha256', integration.inboundSecret)
                    .update(rawBody)
                    .digest('hex');

                // Support various signature formats
                const cleanSig = signature.replace('sha256=', '').replace('sha1=', '');
                return expectedSig === cleanSig || `sha256=${expectedSig}` === signature;

            default:
                return false;
        }
    }

    private createEventHash(
        integrationId: string,
        payload: Record<string, any>,
        eventType: string,
    ): string {
        const orderId = payload.order?.id || payload.id || payload.order_id || '';
        const occurredAt = payload.occurred_at || payload.created_at || payload.updated_at || '';

        const hashInput = `${integrationId}:${orderId}:${eventType}:${occurredAt}`;
        return createHash('sha256').update(hashInput).digest('hex');
    }

    private evaluateMatchRules(
        rules: Record<string, any>,
        payload: Record<string, any>,
        normalized: NormalizedPayload,
    ): boolean {
        if (!rules || Object.keys(rules).length === 0) {
            return true; // No rules = always match
        }

        for (const [key, expectedValue] of Object.entries(rules)) {
            const actualValue = this.normalizer.getNestedValue(payload, key)
                || this.normalizer.getNestedValue(normalized as any, key);

            if (typeof expectedValue === 'string') {
                if (actualValue !== expectedValue) return false;
            } else if (Array.isArray(expectedValue)) {
                if (!expectedValue.includes(actualValue)) return false;
            } else if (typeof expectedValue === 'object') {
                // Complex rules like { exists: true }, { includes: "value" }
                if (expectedValue.exists !== undefined) {
                    if ((actualValue !== undefined) !== expectedValue.exists) return false;
                }
                if (expectedValue.includes !== undefined) {
                    if (!String(actualValue || '').includes(expectedValue.includes)) return false;
                }
            }
        }

        return true;
    }

    private buildTemplateParams(
        variablesMap: Record<string, string>,
        payload: Record<string, any>,
        normalized: NormalizedPayload,
    ): Record<string, any> {
        const params: Record<string, any> = {};

        for (const [variable, path] of Object.entries(variablesMap)) {
            let value = this.normalizer.getNestedValue(payload, path);
            if (value === undefined) {
                value = this.normalizer.getNestedValue(normalized as any, path);
            }
            params[variable] = value ?? '';
        }

        return params;
    }

    private async forwardToN8n(
        webhookUrl: string,
        event: WebhookEventInbox,
        normalized: NormalizedPayload,
    ): Promise<void> {
        try {
            const payload = {
                tenant_id: event.tenantId,
                event_type_code: event.eventTypeCode,
                order_id: normalized.orderId,
                phone_e164: normalized.phoneE164,
                occurred_at: normalized.occurredAt,
                data: normalized,
            };

            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            this.logger.debug(`Forwarded to n8n: ${webhookUrl}`);
        } catch (error) {
            this.logger.error(`n8n forward failed: ${error.message}`);
        }
    }

    // ===================== Statistics =====================

    async getStatistics(tenantId: string): Promise<{
        totalIntegrations: number;
        activeIntegrations: number;
        eventsToday: number;
        messagesQueued: number;
        messagesSent: number;
        messagesFailed: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalIntegrations,
            activeIntegrations,
            eventsToday,
            messagesQueued,
            messagesSent,
            messagesFailed,
        ] = await Promise.all([
            this.integrationRepo.count({ where: { tenantId } }),
            this.integrationRepo.count({ where: { tenantId, isEnabled: true } }),
            this.inboxRepo.count({
                where: {
                    tenantId,
                    receivedAt: { $gte: today } as any,
                },
            }),
            this.outboxRepo.count({ where: { tenantId, status: MessageStatus.QUEUED } }),
            this.outboxRepo.count({ where: { tenantId, status: MessageStatus.SENT } }),
            this.outboxRepo.count({ where: { tenantId, status: MessageStatus.FAILED } }),
        ]);

        return {
            totalIntegrations,
            activeIntegrations,
            eventsToday,
            messagesQueued,
            messagesSent,
            messagesFailed,
        };
    }

    // ===================== Test Helpers =====================

    async testWebhook(
        tenantId: string,
        integrationId: string,
        payload: Record<string, any>,
    ): Promise<{ success: boolean; normalized: NormalizedPayload; detectedEventType: string }> {
        const integration = await this.findIntegration(tenantId, integrationId);

        const detectedEventType = this.normalizer.detectEventType(integration.provider, payload);
        const normalized = this.normalizer.normalize(integration.provider, payload, detectedEventType);

        return {
            success: true,
            normalized,
            detectedEventType,
        };
    }
}
