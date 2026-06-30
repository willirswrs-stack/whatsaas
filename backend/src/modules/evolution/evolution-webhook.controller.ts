import {
  Controller,
  Post,
  Body,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Instance } from '../instances/entities/instance.entity';
import {
  Campaign,
  CampaignContact,
} from '../campaigns/entities/campaign.entity';
import { InstanceStatus } from '../../common/enums/instance-status.enum';
import { FlowExecution } from '../flows/entities/flow.entity';
import { FlowsService } from '../flows/flows.service';
import { Contact } from '../contacts/entities/contact.entity';
import { GroupWarmupService } from '../anti-ban/group-warmup.service';
import { InboxService } from '../inbox/inbox.service';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';

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
    @Inject(forwardRef(() => GroupWarmupService))
    private groupWarmupService: GroupWarmupService,
    @Inject(forwardRef(() => InboxService))
    private inboxService: InboxService,
    private providerFactory: WhatsAppProviderFactory,
  ) {}

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

    // Verifica statusCode do Evolution API para identificar BANS
    const statusCode = data.statusCode || data.error || data.reasonCode;
    const reasonStr = (data.reason || data.statusReason || '')
      .toString()
      .toLowerCase();

    if (s === 'open' || s === 'connected') {
      status = InstanceStatus.CONNECTED;
    } else if (s === 'connecting') {
      status = InstanceStatus.CONNECTING;
    } else if (s === 'reconnecting') {
      status = InstanceStatus.RECONNECTING;
    } else if (s === 'close' || s === 'disconnected') {
      // Erro 403 (Forbidden) e 401 (Unauthorized) na Baileys/Evolution geralmente significam BAN ou Logged Out
      if (
        statusCode === 403 ||
        statusCode === 401 ||
        reasonStr.includes('ban') ||
        reasonStr.includes('forbidden')
      ) {
        status = InstanceStatus.BANNED;
      } else {
        status = InstanceStatus.DISCONNECTED;
      }
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

    try {
      const existingInstance = await this.instanceRepo.findOne({
        where: { instanceName },
        relations: ['chipDetail'],
      });
      if (existingInstance) {
        // Lógica de BAN e DESBAN (Voltas)
        if (existingInstance.status !== status) {
          if (
            status === InstanceStatus.BANNED &&
            existingInstance.status === InstanceStatus.CONNECTED
          ) {
            this.logger.warn(
              `🚨 INSTÂNCIA BANIDA: ${instanceName} (Status Code: ${statusCode})`,
            );
            if (existingInstance.chipDetail) {
              existingInstance.chipDetail.banCount =
                (existingInstance.chipDetail.banCount || 0) + 1;
            }
          } else if (
            status === InstanceStatus.CONNECTED &&
            existingInstance.status === InstanceStatus.BANNED
          ) {
            this.logger.log(`🎉 INSTÂNCIA DESBANIDA (VOLTOU): ${instanceName}`);
            if (existingInstance.chipDetail) {
              existingInstance.chipDetail.unbanCount =
                (existingInstance.chipDetail.unbanCount || 0) + 1;
            }
          }

          if (existingInstance.chipDetail) {
            // O save na instance faz o cascade do chipDetail se tiver sido alterado
            Object.assign(existingInstance, updateData);
            await this.instanceRepo.save(existingInstance);
          } else {
            await this.instanceRepo.update({ instanceName }, updateData);
          }
        } else {
          await this.instanceRepo.update({ instanceName }, updateData);
        }

        // 🚀 FALLBACK: Se o status for CONNECTED, mas não temos o telefone vindo no payload
        if (
          status === InstanceStatus.CONNECTED &&
          !updateData.phone &&
          !existingInstance.phone
        ) {
          this.logger.log(
            `Phone number missing for connected instance ${instanceName} in DB/webhook. Querying provider...`,
          );
          const provider = this.providerFactory.getProvider(
            (existingInstance.provider as any) || 'evolution',
          );
          const providerStatus = await provider.getStatus(instanceName);
          if (providerStatus?.phoneNumber) {
            updateData.phone = providerStatus.phoneNumber.replace(
              '@s.whatsapp.net',
              '',
            );
            this.logger.log(
              `Phone number successfully recovered from provider: ${updateData.phone}`,
            );
            await this.instanceRepo.update(
              { instanceName },
              { phone: updateData.phone },
            );
          }
        }
      }
    } catch (err) {
      this.logger.error(
        `Error updating instance ${instanceName}: ${err.message}`,
      );
    }

    this.logger.log(`Instance ${instanceName} status updated to: ${status}`);
  }

  private async handleQrCodeUpdate(instanceName: string, _data: any) {
    // QR code generated, instance awaiting scan
    await this.instanceRepo.update(
      { instanceName },
      { status: InstanceStatus.QR_PENDING },
    );
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
        select: ['id', 'campaignId', 'status'],
      });

      if (!contact) return;

      if (status === 'DELIVERY_ACK' || status === 'delivered') {
        if (contact.status !== 'delivered' && contact.status !== 'read') {
          await this.campaignContactRepo.update(contact.id, {
            status: 'delivered',
            deliveredAt: new Date(),
          });
          await this.campaignRepo.increment(
            { id: contact.campaignId },
            'deliveredCount',
            1,
          );

          // Emit update to tenant
          const campaign = await this.campaignRepo.findOne({
            where: { id: contact.campaignId },
          });
          if (campaign) {
            this.emitCampaignUpdate(
              campaign.tenantId,
              campaign.id,
              'delivered',
            );
            // Check completion
            await this.checkCampaignCompletion(campaign);
          }
        }
      } else if (status === 'READ' || status === 'read') {
        if (contact.status !== 'read') {
          await this.campaignContactRepo.update(contact.id, {
            status: 'read',
            readAt: new Date(),
          });
          await this.campaignRepo.increment(
            { id: contact.campaignId },
            'readCount',
            1,
          );

          // Emit update to tenant
          const campaign = await this.campaignRepo.findOne({
            where: { id: contact.campaignId },
          });
          if (campaign) {
            this.emitCampaignUpdate(campaign.tenantId, campaign.id, 'read');
            // Check completion
            await this.checkCampaignCompletion(campaign);
          }
        }
      }
    } catch (e) {
      this.logger.error(
        `Error updating message status for ${wamid}: ${e.message}`,
      );
    }

    this.logger.debug(`Message ${wamid} status: ${status}`);
  }

  private async checkCampaignCompletion(campaign: Campaign) {
    if (campaign.status !== 'running' && campaign.status !== 'paused') return;

    const processed = (campaign.sentCount || 0) + (campaign.failedCount || 0);
    if (processed >= campaign.totalContacts) {
      await this.campaignRepo.update(campaign.id, {
        status: 'completed',
        completedAt: new Date(),
      });
      this.logger.log(`🏁 Campanha ${campaign.id} concluída (via webhook)!`);

      this.eventsGateway.emitToTenant(campaign.tenantId, 'campaign.updated', {
        id: campaign.id,
        status: 'completed',
      });
    }
  }

  // Injetar gateway dinamicamente para evitar ciclo ou usar um service
  // Por simplicidade, vamos usar o Logger ou implementar no futuro o socket aqui
  // TODO: Injetar EventsGateway para real-time updates no frontend
  private emitCampaignUpdate(
    tenantId: string,
    campaignId: string,
    type: 'delivered' | 'read',
  ) {
    this.eventsGateway.emitToTenant(tenantId, 'campaign.stats', {
      campaignId,
      type, // 'delivered' or 'read'
      timestamp: new Date(),
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
        const phone = remoteJid
          .replace('@s.whatsapp.net', '')
          .replace('@g.us', '');
        const isGroup = remoteJid.endsWith('@g.us');

        // Detect message type
        let messageType:
          | 'text'
          | 'image'
          | 'video'
          | 'audio'
          | 'document'
          | 'sticker'
          | 'other' = 'text';
        if (msg.message?.imageMessage) messageType = 'image';
        else if (msg.message?.videoMessage) messageType = 'video';
        else if (msg.message?.audioMessage) messageType = 'audio';
        else if (msg.message?.documentMessage) messageType = 'document';
        else if (msg.message?.stickerMessage) messageType = 'sticker';

        // Get message content
        const interactiveResponse = msg.message?.interactiveResponseMessage;
        const flowResponse = interactiveResponse?.nativeFlowResponseMessage;
        let isFlowResponse = false;
        let flowPayload: Record<string, any> = {};

        let messageContent =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          msg.message?.documentMessage?.caption ||
          (messageType !== 'text'
            ? `[${messageType.charAt(0).toUpperCase() + messageType.slice(1)}]`
            : '[Mídia]');

        if (flowResponse) {
          isFlowResponse = true;
          try {
            flowPayload = JSON.parse(flowResponse.paramsJson);
            messageContent = `[Formulário WhatsApp Enviado]: ${flowResponse.name || 'Flow'}`;
          } catch (e) {
            messageContent = '[Formulário WhatsApp Enviado]';
          }
        }


        const remoteName =
          msg.pushName || msg.key?.participant?.split('@')[0] || undefined;

        this.logger.log(
          `📥 Incoming message from ${phone}: ${messageContent.substring(0, 50)}`,
        );

        // Find instance to get tenantId
        const instance = await this.instanceRepo.findOne({
          where: { instanceName },
          relations: ['tenant'],
        });
        if (!instance) continue;
        const servicesEnabled =
          (instance as any).tenant?.settings?.features?.services_enabled !==
          false;

        // 📦 PERSIST TO INBOX (both individual and group messages)
        this.inboxService
          .saveMessage({
            tenantId: instance.tenantId,
            instanceId: instance.id,
            instanceName: instance.instanceName,
            remoteJid,
            remotePhone: phone,
            remoteName,
            wamid: msg.key?.id,
            direction: 'inbound',
            type: messageType,
            content: messageContent,
            status: 'received',
            isGroup,
            groupName: isGroup
              ? msg.key?.remoteJid?.split('@')[0] || undefined
              : undefined,
            rawPayload: msg,
          })
          .catch((err) =>
            this.logger.error(
              `Failed to persist inbox message: ${err.message}`,
            ),
          );

        // 📡 Emit real-time event to tenant's WebSocket room
        this.eventsGateway.emitToTenant(instance.tenantId, 'inbox.message', {
          remoteJid,
          remotePhone: phone,
          remoteName,
          instanceId: instance.id,
          instanceName: instance.instanceName,
          direction: 'inbound',
          type: messageType,
          content: messageContent,
          isGroup,
          timestamp: new Date().toISOString(),
        });

        // Intercept group messages for proactive, reactive warm-up interaction
        if (isGroup) {
          if (servicesEnabled) {
            this.groupWarmupService
              .handleGroupIncomingMessage(
                instanceName,
                remoteJid,
                messageContent,
              )
              .catch((err) => {
                this.logger.error(
                  `Failed during reactive group warmup: ${err.message}`,
                );
              });
          }
          continue; // Shield regular workflow engines from group chat clutter
        }

        // If services are disabled, don't trigger flows or wait for responses
        if (!servicesEnabled) {
          continue;
        }

        // Find contact by phone
        const contact = await this.contactRepo.findOne({
          where: {
            phone,
            tenantId: instance.tenantId,
          },
        });
        if (!contact) {
          this.logger.debug(`Contact not found for phone ${phone}`);
          continue;
        }

        // Find any flow execution waiting for response from this contact
        const execution = await this.flowExecutionRepo.findOne({
          where: {
            contactId: contact.id,
            status: 'waiting_response' as any,
          },
        });

        if (execution) {
          // --- HYBRID GATEWAY ROUTING SWITCH ---
          if (instance.channelType === 'official') {
            const hybridEnabled =
              instance.tenant?.settings?.hybridRoutingEnabled !== false;

            if (hybridEnabled) {
              const unofficialInstance = await this.instanceRepo.findOne({
                where: {
                  tenantId: instance.tenantId,
                  channelType: 'unofficial',
                  status: InstanceStatus.CONNECTED,
                },
                order: {
                  connectedAt: 'DESC',
                },
              });

              if (unofficialInstance) {
                this.logger.log(
                  `🔀 [Hybrid Gateway] Switching flow execution ${execution.id} from Official instance (${instance.instanceName}) to Unofficial instance (${unofficialInstance.instanceName})`,
                );
                execution.instanceId = unofficialInstance.id;
              }
            }
          }

          this.logger.log(
            `📝 Resuming flow execution ${execution.id} with answer: ${messageContent.substring(0, 30)}`,
          );

          // Save the user's answer in variables
          const saveTo = execution.variables?.waitingSaveTo || 'lastAnswer';

          if (isFlowResponse) {
            execution.variables = {
              ...execution.variables,
              ...flowPayload,
              lastFlowResponse: flowPayload,
              lastUserMessage: messageContent,
              waitingForAnswer: false,
            };

            // Update contact customFields as well!
            if (Object.keys(flowPayload).length > 0) {
              contact.customFields = {
                ...contact.customFields,
                ...flowPayload,
              };
              await this.contactRepo.save(contact);
            }
          } else {
            execution.variables = {
              ...execution.variables,
              [saveTo]: messageContent,
              lastUserMessage: messageContent,
              waitingForAnswer: false,
            };
          }

          // Add log entry
          execution.logs = execution.logs || [];
          execution.logs.push({
            nodeId: execution.currentNodeId,
            action: 'answer_received',
            timestamp: new Date().toISOString(),
            data: {
              answer: messageContent,
              savedTo: saveTo,
              isFlowResponse,
              flowPayload: isFlowResponse ? flowPayload : undefined,
            },
          });


          // Change status back to running
          execution.status = 'running';
          await this.flowExecutionRepo.save(execution);

          // Resume flow processing
          this.flowsService.processExecution(execution.id).catch((err) => {
            this.logger.error(`Error resuming flow: ${err.message}`);
          });
        } else {
          // No active execution waiting for response, check for keyword triggers
          await this.flowsService.checkFlowTriggers(
            instance.tenantId,
            instance.id,
            contact.id,
            messageContent,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error handling incoming message: ${error.message}`);
    }
  }
}
