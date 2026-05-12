
import { Controller, Post, Get, Query, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { Campaign, CampaignContact } from '../campaigns/entities/campaign.entity';
import { Instance } from '../instances/entities/instance.entity';
import { FlowExecution } from '../flows/entities/flow.entity';
import { FlowsService } from '../flows/flows.service';
import { Contact } from '../contacts/entities/contact.entity';
import { EventsGateway } from '../events/events.gateway';

@SkipThrottle()
@Controller('webhooks/meta')
export class MetaWebhookController {
    private readonly logger = new Logger(MetaWebhookController.name);

    constructor(
        @InjectRepository(Campaign)
        private campaignRepo: Repository<Campaign>,
        @InjectRepository(CampaignContact)
        private campaignContactRepo: Repository<CampaignContact>,
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        @InjectRepository(FlowExecution)
        private flowExecutionRepo: Repository<FlowExecution>,
        @InjectRepository(Contact)
        private contactRepo: Repository<Contact>,
        private configService: ConfigService,
        private eventsGateway: EventsGateway,
        private flowsService: FlowsService,
    ) { }

    /**
     * Webhook verification (GET)
     */
    @Get()
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
    ) {
        const verifyToken = this.configService.get('META_VERIFY_TOKEN') || 'wathsaas_meta_verify_token';

        if (mode === 'subscribe' && token === verifyToken) {
            this.logger.log('WEBHOOK_VERIFIED');
            return challenge;
        }

        this.logger.error('WEBHOOK_VERIFICATION_FAILED');
        return 'Verification failed';
    }

    /**
     * Webhook data (POST)
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    async handleWebhook(@Body() payload: any) {
        // Log basic info
        // this.logger.debug(`Received Meta Webhook: ${JSON.stringify(payload, null, 2)}`);

        const entries = payload.entry || [];

        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                const value = change.value;
                if (!value || value.messaging_product !== 'whatsapp') continue;

                // Handle status updates (delivered, read, failed)
                if (value.statuses) {
                    await this.handleStatusUpdates(value.statuses);
                }

                // Handle incoming messages
                if (value.messages) {
                    await this.handleMessages(value.metadata?.display_phone_number, value.messages);
                }
            }
        }

        return { status: 'success' };
    }

    private async handleStatusUpdates(statuses: any[]) {
        for (const statusObj of statuses) {
            const messageId = statusObj.id;
            const status = statusObj.status; // sent, delivered, read, failed
            const recipientPhone = statusObj.recipient_id;

            this.logger.debug(`Meta Message Status: ${messageId} -> ${status}`);

            try {
                // Find campaign contact by messageId
                const contact = await this.campaignContactRepo.findOne({
                    where: { messageId },
                    relations: ['campaign'],
                    select: {
                        id: true,
                        campaignId: true,
                        status: true,
                        campaign: {
                            id: true,
                            tenantId: true
                        }
                    }
                });

                if (!contact) continue;
                const tenantId = contact.campaign.tenantId;

                if (status === 'delivered') {
                    if (contact.status !== 'delivered' && contact.status !== 'read') {
                        await this.campaignContactRepo.update(contact.id, {
                            status: 'delivered',
                            deliveredAt: new Date()
                        });
                        await this.campaignRepo.increment({ id: contact.campaignId }, 'deliveredCount', 1);
                        this.emitCampaignStats(tenantId, contact.campaignId, 'delivered');
                    }
                } else if (status === 'read') {
                    if (contact.status !== 'read') {
                        // If it wasn't delivered yet in our system, increment delivered too? 
                        // Usually Meta sends them in order, but just in case:
                        const updates: any = { status: 'read', readAt: new Date() };
                        if (contact.status !== 'delivered') {
                            updates.deliveredAt = new Date();
                            await this.campaignRepo.increment({ id: contact.campaignId }, 'deliveredCount', 1);
                        }

                        await this.campaignContactRepo.update(contact.id, updates);
                        await this.campaignRepo.increment({ id: contact.campaignId }, 'readCount', 1);
                        this.emitCampaignStats(tenantId, contact.campaignId, 'read');
                    }
                } else if (status === 'failed') {
                    const error = statusObj.errors?.[0]?.message || 'Meta API Error';
                    await this.campaignContactRepo.update(contact.id, {
                        status: 'failed',
                        errorMessage: error
                    });
                    // Note: sentCount was already incremented when trying to send. 
                    // Should we decrement it and increment failedCount? 
                    // Usually failed in webhook means it was "accepted" then failed.
                    await this.campaignRepo.increment({ id: contact.campaignId }, 'failedCount', 1);
                }
            } catch (err) {
                this.logger.error(`Error processing status update: ${err.message}`);
            }
        }
    }

    private async handleMessages(displayPhone: string, messages: any[]) {
        for (const msg of messages) {
            const from = msg.from; // Phone number
            let text = '';

            if (msg.type === 'text') {
                text = msg.text?.body;
            } else if (msg.type === 'button') {
                text = msg.button?.text;
            } else if (msg.type === 'interactive') {
                text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title;
            }

            this.logger.log(`📥 Meta Incoming from ${from}: ${text.substring(0, 50)}`);

            try {
                // Find instance by phone (to get tenantId)
                // Note: displayPhone from Meta might include CC
                const cleanDisplayPhone = displayPhone?.replace(/\D/g, '');
                const instance = await this.instanceRepo.findOne({
                    where: { phone: cleanDisplayPhone }
                });

                if (!instance) {
                    // Try without leading CC if it exists or vice versa? 
                    // For now assume it matches.
                    continue;
                }

                // Find contact in this tenant
                const contact = await this.contactRepo.findOne({
                    where: { phone: from, tenantId: instance.tenantId }
                });

                if (!contact) continue;

                // Resume flow execution
                const execution = await this.flowExecutionRepo.findOne({
                    where: {
                        contactId: contact.id,
                        status: 'waiting_response' as any
                    }
                });

                if (execution) {
                    const saveTo = execution.variables?.waitingSaveTo || 'lastAnswer';
                    execution.variables = {
                        ...execution.variables,
                        [saveTo]: text,
                        lastUserMessage: text,
                        waitingForAnswer: false,
                    };

                    execution.logs = execution.logs || [];
                    execution.logs.push({
                        nodeId: execution.currentNodeId,
                        action: 'answer_received',
                        timestamp: new Date().toISOString(),
                        data: { answer: text, savedTo: saveTo, source: 'meta' }
                    });

                    execution.status = 'running';
                    await this.flowExecutionRepo.save(execution);

                    this.flowsService.processExecution(execution.id).catch(err => {
                        this.logger.error(`Error resuming Meta flow: ${err.message}`);
                    });
                }

            } catch (err) {
                this.logger.error(`Error processing Meta message: ${err.message}`);
            }
        }
    }

    private emitCampaignStats(tenantId: string, campaignId: string, type: 'delivered' | 'read') {
        if (!this.eventsGateway) return;
        this.eventsGateway.emitToTenant(tenantId, 'campaign.stats', {
            campaignId,
            type,
            timestamp: new Date()
        });
    }
}
