
import { Controller, Post, Body, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Instance } from '../instances/entities/instance.entity';
import { Campaign, CampaignContact } from '../campaigns/entities/campaign.entity';
import { InstanceStatus } from '../../common/enums/instance-status.enum';
import { FlowExecution } from '../flows/entities/flow.entity';
import { FlowsService } from '../flows/flows.service';
import { Contact } from '../contacts/entities/contact.entity';

import { SkipThrottle } from '@nestjs/throttler';

interface EvolutionWebhookPayload {
    instance: string;
    event: string;
    data: any;
}

import { EventsGateway } from '../events/events.gateway';

@SkipThrottle()
@Controller('webhooks')
export class EvolutionWebhookController {
    private readonly logger = new Logger(EvolutionWebhookController.name);

    constructor(
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        @InjectRepository(CampaignContact)
        private campaignContactRepo: Repository<CampaignContact>,
        @InjectRepository(Campaign)
        private campaignRepo: Repository<Campaign>,
        @InjectRepository(FlowExecution)
        private flowExecutionRepo: Repository<FlowExecution>,
        @InjectRepository(Contact)
        private contactRepo: Repository<Contact>,
        private eventsGateway: EventsGateway,
        private flowsService: FlowsService,
    ) { }

    @Post('evolution')
    async handleEvolutionWebhook(@Body() payload: EvolutionWebhookPayload) {
        const { instance, event, data } = payload;

        this.logger.debug(`Webhook: ${event} for ${instance}`);

        try {
            switch (event) {
                case 'CONNECTION_UPDATE':
                    await this.handleConnectionUpdate(instance, data);
                    break;

                case 'QRCODE_UPDATED':
                    await this.handleQrCodeUpdate(instance, data);
                    break;

                case 'MESSAGES_UPDATE':
                case 'messages.update':
                    await this.handleMessageUpdate(data);
                    break;

                case 'SEND_MESSAGE':
                    await this.handleSendMessage(data);
                    break;

                case 'MESSAGES_UPSERT':
                case 'messages.upsert':
                    await this.handleIncomingMessage(instance, data);
                    break;

                default:
                    this.logger.debug(`Unhandled event: ${event}`);
            }
        } catch (error) {
            this.logger.error(`Webhook error: ${error.message}`);
        }

        return { received: true };
    }

    private async handleConnectionUpdate(instanceName: string, data: any) {
        const state = data.state || data.status;
        let status: InstanceStatus = InstanceStatus.DISCONNECTED;

        const s = (state || '').toLowerCase();

        if (s === 'open' || s === 'connected') {
            status = InstanceStatus.CONNECTED;
        } else if (s === 'connecting') {
            status = InstanceStatus.CONNECTING;
        } else if (s === 'close' || s === 'disconnected') {
            status = InstanceStatus.DISCONNECTED;
        } else if (s === 'qrcode') {
            status = InstanceStatus.QR_PENDING;
        }

        const updateData: Partial<Instance> = {
            status,
        };

        if (status === InstanceStatus.CONNECTED) {
            updateData.connectedAt = new Date();
        }

        if (data.me?.id) {
            updateData.phone = data.me.id.replace('@s.whatsapp.net', '');
        }

        await this.instanceRepo.update({ instanceName }, updateData);

        this.logger.log(`Instance ${instanceName} status updated to: ${status}`);
    }

    private async handleQrCodeUpdate(instanceName: string, _data: any) {
        // QR code generated, instance awaiting scan
        await this.instanceRepo.update({ instanceName }, { status: InstanceStatus.QR_PENDING });
    }

    private async handleMessageUpdate(data: any) {
        // Update message status (delivered, read)
        const wamid = data.key?.id || data.messageId;
        const status = data.update?.status || data.status;

        if (!wamid) return;

        // Try to update campaign tracking info
        try {
            const contact = await this.campaignContactRepo.findOne({
                where: { messageId: wamid },
                select: ['id', 'campaignId', 'status']
            });

            if (!contact) return;


            if (status === 'DELIVERY_ACK' || status === 'delivered') {
                if (contact.status !== 'delivered' && contact.status !== 'read') {
                    await this.campaignContactRepo.update(contact.id, {
                        status: 'delivered',
                        deliveredAt: new Date()
                    });
                    await this.campaignRepo.increment({ id: contact.campaignId }, 'deliveredCount', 1);

                    // Emit update to tenant
                    const campaign = await this.campaignRepo.findOne({ where: { id: contact.campaignId } });
                    if (campaign) {
                        this.emitCampaignUpdate(campaign.tenantId, campaign.id, 'delivered');
                        // Check completion
                        await this.checkCampaignCompletion(campaign);
                    }
                }
            } else if (status === 'READ' || status === 'read') {
                if (contact.status !== 'read') {
                    await this.campaignContactRepo.update(contact.id, {
                        status: 'read',
                        readAt: new Date()
                    });
                    await this.campaignRepo.increment({ id: contact.campaignId }, 'readCount', 1);

                    // Emit update to tenant
                    const campaign = await this.campaignRepo.findOne({ where: { id: contact.campaignId } });
                    if (campaign) {
                        this.emitCampaignUpdate(campaign.tenantId, campaign.id, 'read');
                        // Check completion
                        await this.checkCampaignCompletion(campaign);
                    }
                }
            }
        } catch (e) {
            this.logger.error(`Error updating message status for ${wamid}: ${e.message}`);
        }

        this.logger.debug(`Message ${wamid} status: ${status}`);
    }

    private async checkCampaignCompletion(campaign: Campaign) {
        if (campaign.status !== 'running') return;

        const processed = (campaign.sentCount || 0) + (campaign.failedCount || 0);
        if (processed >= campaign.totalContacts) {
            await this.campaignRepo.update(campaign.id, {
                status: 'completed',
                completedAt: new Date()
            });
            this.logger.log(`🏁 Campanha ${campaign.id} concluída (via webhook)!`);

            this.eventsGateway.emitToTenant(campaign.tenantId, 'campaign.updated', {
                id: campaign.id,
                status: 'completed'
            });
        }
    }

    // Injetar gateway dinamicamente para evitar ciclo ou usar um service
    // Por simplicidade, vamos usar o Logger ou implementar no futuro o socket aqui
    // TODO: Injetar EventsGateway para real-time updates no frontend
    private emitCampaignUpdate(tenantId: string, campaignId: string, type: 'delivered' | 'read') {
        this.eventsGateway.emitToTenant(tenantId, 'campaign.stats', {
            campaignId,
            type, // 'delivered' or 'read'
            timestamp: new Date()
        });
    }

    private async handleSendMessage(data: any) {
        // Message sent confirmation
        const wamid = data.key?.id;
        this.logger.debug(`Message sent event: ${wamid}`);
    }

    private async handleIncomingMessage(instanceName: string, data: any) {
        // Handle incoming messages to resume flows waiting for answer
        try {
            // Extract message details
            const messages = data.messages || [data];

            for (const msg of messages) {
                // Only process incoming messages (not sent by us)
                if (msg.key?.fromMe) continue;

                const remoteJid = msg.key?.remoteJid;
                if (!remoteJid) continue;

                // Extract phone number
                const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');

                // Get message content
                const messageContent =
                    msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    msg.message?.imageMessage?.caption ||
                    msg.message?.videoMessage?.caption ||
                    '[Mídia]';

                this.logger.log(`📥 Incoming message from ${phone}: ${messageContent.substring(0, 50)}`);

                // Find instance to get tenantId
                const instance = await this.instanceRepo.findOne({ where: { instanceName } });
                if (!instance) continue;

                // Find contact by phone
                const contact = await this.contactRepo.findOne({
                    where: {
                        phone,
                        tenantId: instance.tenantId
                    }
                });
                if (!contact) {
                    this.logger.debug(`Contact not found for phone ${phone}`);
                    continue;
                }

                // Find any flow execution waiting for response from this contact
                const execution = await this.flowExecutionRepo.findOne({
                    where: {
                        contactId: contact.id,
                        status: 'waiting_response' as any
                    }
                });

                if (execution) {
                    this.logger.log(`📝 Resuming flow execution ${execution.id} with answer: ${messageContent.substring(0, 30)}`);

                    // Save the user's answer in variables
                    const saveTo = execution.variables?.waitingSaveTo || 'lastAnswer';
                    execution.variables = {
                        ...execution.variables,
                        [saveTo]: messageContent,
                        lastUserMessage: messageContent,
                        waitingForAnswer: false,
                    };

                    // Add log entry
                    execution.logs = execution.logs || [];
                    execution.logs.push({
                        nodeId: execution.currentNodeId,
                        action: 'answer_received',
                        timestamp: new Date().toISOString(),
                        data: { answer: messageContent, savedTo: saveTo }
                    });

                    // Change status back to running
                    execution.status = 'running';
                    await this.flowExecutionRepo.save(execution);

                    // Resume flow processing
                    this.flowsService.processExecution(execution.id).catch(err => {
                        this.logger.error(`Error resuming flow: ${err.message}`);
                    });
                } else {
                    // No active execution waiting for response, check for keyword triggers
                    await this.flowsService.checkFlowTriggers(
                        instance.tenantId,
                        instance.id,
                        contact.id,
                        messageContent
                    );
                }
            }
        } catch (error) {
            this.logger.error(`Error handling incoming message: ${error.message}`);
        }
    }
}
