import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Instance } from '../instances/entities/instance.entity';
import { Campaign, CampaignContact, MessageVariation } from '../campaigns/entities/campaign.entity';
import { ProxyEntity } from '../proxies/entities/proxy.entity';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { DISPATCH_QUEUE } from '../../config/bull.config';

// Anti-Ban Services
import { HumanBehaviorService, TimingMetadata } from '../anti-ban/human-behavior.service';
import { PatternBreakerService } from '../anti-ban/pattern-breaker.service';
import { DelayGeneratorService } from '../anti-ban/delay-generator.service';
import { StackRouterService, StackRoutingInput, StackType } from '../anti-ban/stack-router.service';
import { AntiBanAnalyticsService } from '../anti-ban/analytics.service';
import { ActivePreventionService } from '../anti-ban/active-prevention.service';

import { FlowsService } from '../flows/flows.service';
import { EventsGateway } from '../events/events.gateway';
import { InboxService } from '../inbox/inbox.service';

import { MetaTemplatesService } from '../meta-templates/meta-templates.service';
import { MetaGraphApiService } from '../meta-templates/meta-graph-api.service';

export interface DispatchJobData {
    tenantId: string;
    campaignContactId: string;
    campaignId: string;
}

export interface DispatchResult {
    success: boolean;
    messageId?: string;
    timing?: TimingMetadata;
    stackUsed?: StackType;
    stackConfidence?: number;
    error?: string;
}

@Processor(DISPATCH_QUEUE, {
    lockDuration: 120000, // 2 minutes to allow for long Human Behavior delays
    concurrency: 5 // Optional: limit concurrency to prevent overloading
})
@Injectable()
export class DispatcherProcessor extends WorkerHost {
    private readonly logger = new Logger(DispatcherProcessor.name);

    // Round-Robin state per tenant
    private instanceIndex = new Map<string, number>();

    // Track warmup alerts already sent (instanceId -> timestamp) to avoid spamming the user
    private warmupAlertSent = new Map<string, number>();

    // Track instances that the user explicitly allowed to exceed warmup limits
    // Key: instanceId, Value: timestamp when override was granted
    private warmupOverrides = new Map<string, number>();

    // Cache para os templates do Meta
    private metaTemplateCache = new Map<string, any>();

    constructor(
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        @InjectRepository(CampaignContact)
        private campaignContactRepo: Repository<CampaignContact>,
        @InjectRepository(MessageVariation)
        private variationRepo: Repository<MessageVariation>,
        @InjectRepository(Campaign)
        private campaignRepo: Repository<Campaign>,
        private whatsAppFactory: WhatsAppProviderFactory,
        // Anti-Ban Services
        private humanBehavior: HumanBehaviorService,
        private patternBreaker: PatternBreakerService,
        private delayGenerator: DelayGeneratorService,
        private stackRouter: StackRouterService,
        private analytics: AntiBanAnalyticsService,
        private flowsService: FlowsService,
        private eventsGateway: EventsGateway,
        private metaTemplatesService: MetaTemplatesService,
        private metaGraphApiService: MetaGraphApiService,
        private activePrevention: ActivePreventionService,
        private inboxService: InboxService,
    ) {
        super();
        this.logger.log('✅ DispatcherProcessor INSTANTIATED');
    }

    onModuleInit() {
        this.logger.log(`🔧 DispatcherProcessor initialized for queue: ${DISPATCH_QUEUE}`);
    }

    async process(job: Job<DispatchJobData>): Promise<DispatchResult> {
        const { tenantId, campaignContactId, campaignId } = job.data;

        console.log(`🔥 [WORKER-DEBUG] Processing job ${job.id} for contact ${campaignContactId}`);
        this.logger.debug(`Processing job ${job.id} for contact ${campaignContactId}`);

        try {
            // 1. Buscar o registro do contato na campanha
            const campaignContact = await this.campaignContactRepo.findOne({
                where: { id: campaignContactId },
                relations: ['contact', 'campaign', 'campaign.template'],
            });

            if (!campaignContact) {
                throw new Error(`CampaignContact ${campaignContactId} not found`);
            }

            const campaign = campaignContact.campaign;
            const contact = campaignContact.contact;

            // Idempotency: Se já foi enviado, ignorar
            if (campaignContact.status === 'sent') {
                this.logger.log(`Skipping contact ${campaignContactId}: Already sent (Idempotency Check)`);
                return { success: true, messageId: campaignContact.messageId };
            }

            // 2. Verificar janela horária (se configurado)
            /*
            const activeHoursStart = campaign?.settings?.activeHoursStart || '08:00';
            const activeHoursEnd = campaign?.settings?.activeHoursEnd || '20:00';
            
            if (!this.humanBehavior.isWithinActiveHours(activeHoursStart, activeHoursEnd)) {
                this.logger.warn(`Desativado temporariamente: Fora da janela horária.`);
                // const nextActive = this.humanBehavior.getNextActiveTime(activeHoursStart, activeHoursEnd);
                // this.logger.warn(`Fora da janela horária. Reescalonando para ${nextActive.toISOString()}`);
                // await job.moveToDelayed(Date.now() + delayMs, job.token);
                // return { success: false, error: 'Fora da janela horária - reescalonado' };
            }
            */

            // 3. WABA ou Instância?
            let instance: Instance | null = null;
            let wabaAccount: any = null;

            if (campaign.settings?.metaTemplateId && campaign.settings?.wabaAccountId) {
                // É campanha de WABA
                wabaAccount = await this.metaTemplatesService.getWabaAccount(tenantId, campaign.settings.wabaAccountId);
                if (!wabaAccount) {
                    throw new Error('Conta WABA não encontrada');
                }
            } else {
                instance = await this.selectInstance(tenantId, campaign?.instanceId, campaign?.instanceIds, campaignId);
                if (!instance) {
                    this.logger.warn(`No available instance for tenant ${tenantId}`);
                    throw new Error('NO_AVAILABLE_INSTANCE');
                }
            }

            // 4. Se for WABA Meta Template (ignora AI spin, flows, etc.)
            if (wabaAccount && campaign.settings?.metaTemplateId) {
                const [templateName, templateLanguage] = campaign.settings.metaTemplateId.split('|');
                const accessToken = await this.metaTemplatesService.getDecryptedAccessToken(wabaAccount.id);
                const recipientPhone = contact.phone.replace(/\D/g, '');
                
                this.logger.log(`📤 Enviando template Meta ${templateName} para ${recipientPhone}`);
                
                try {
                    // Resolver variáveis do template (ex: {{1}})
                    let metaTemplate = this.metaTemplateCache.get(templateName);
                    if (!metaTemplate) {
                        this.logger.log(`🔍 Buscando definição do template "${templateName}" na Meta...`);
                        metaTemplate = await this.metaGraphApiService.getTemplate(wabaAccount.wabaId, accessToken, templateName);
                        if (metaTemplate) {
                            this.metaTemplateCache.set(templateName, metaTemplate);
                        } else {
                            throw new Error(`Definição do template "${templateName}" não encontrada na Meta. Verifique se o nome está correto.`);
                        }
                    }

                    this.logger.debug(`[TEMPLATE COMPONENTS]: ${JSON.stringify(metaTemplate?.components)}`);

                    // PRE-UPLOAD MEDIA IF NEEDED
                    let mediaId = campaign.settings?.metaMediaId;
                    if (!mediaId && campaign.settings?.metaMediaUrl) {
                        try {
                            const mediaComp = metaTemplate?.components?.find((c: any) => c.type === 'HEADER' && ['IMAGE', 'DOCUMENT', 'VIDEO'].includes(c.format));
                            if (mediaComp) {
                                this.logger.log(`Subindo mídia (URL: ${campaign.settings.metaMediaUrl}) para os servidores da Meta...`);
                                mediaId = await this.metaGraphApiService.uploadMedia(
                                    wabaAccount.phoneNumberId,
                                    accessToken,
                                    campaign.settings.metaMediaUrl,
                                    mediaComp.format.toLowerCase() as any
                                );
                                // Save it back to campaign settings to avoid uploading for every contact
                                campaign.settings.metaMediaId = mediaId;
                                await this.campaignRepo.update(campaignId, { settings: campaign.settings } as any);
                                this.logger.log(`✅ Mídia enviada para a Meta: ID ${mediaId}`);
                            }
                        } catch (uploadError) {
                            this.logger.error(`❌ Erro ao subir mídia: ${uploadError.message}`);
                        }
                    }

                    const componentsPayload: any[] = [];
                    if (metaTemplate?.components) {
                        for (const comp of metaTemplate.components) {
                            if (comp.type === 'BODY') {
                                const text = comp.text || '';
                                const varCount = (text.match(/\{\{\d+\}\}/g) || []).length;
                                if (varCount > 0) {
                                    componentsPayload.push({
                                        type: 'body',
                                        parameters: Array.from({ length: varCount }).map((_, i) => {
                                            const varKey = `body_${i+1}`;
                                            const customVal = campaign.settings?.metaVariables?.[varKey];
                                            let finalVal = customVal;
                                            if (!finalVal) finalVal = i === 0 ? (contact.name?.trim() || 'Cliente') : 'Detalhes';
                                            return { type: 'text', text: finalVal };
                                        })
                                    });
                                }
                            } else if (comp.type === 'HEADER') {
                                if (comp.format === 'TEXT' && comp.text?.includes('{{1}}')) {
                                    const customVal = campaign.settings?.metaVariables?.['header_1'];
                                    componentsPayload.push({
                                        type: 'header',
                                        parameters: [{ type: 'text', text: customVal || contact.name?.trim() || 'Cliente' }]
                                    });
                                } else if (['IMAGE', 'DOCUMENT', 'VIDEO'].includes(comp.format)) {
                                    const mediaUrl = campaign.settings?.metaMediaUrl;
                                    const mId = campaign.settings?.metaMediaId || mediaId;
                                    if (mId) {
                                        componentsPayload.push({
                                            type: 'header',
                                            parameters: [{ 
                                                type: comp.format.toLowerCase(), 
                                                [comp.format.toLowerCase()]: { id: mId } 
                                            }]
                                        });
                                    } else if (mediaUrl) {
                                        // CRITICAL: Meta Cloud API cannot access local URLs like localhost or host.docker.internal
                                        if (mediaUrl.includes('localhost') || mediaUrl.includes('host.docker.internal') || mediaUrl.startsWith('http://192.168')) {
                                            this.logger.error(`❌ [META-WARNING] Tentando enviar URL local para Meta: ${mediaUrl}. Esta mensagem NÃO será entregue, pois a Meta não consegue acessar seu computador local.`);
                                        }

                                        componentsPayload.push({
                                            type: 'header',
                                            parameters: [{ 
                                                type: comp.format.toLowerCase(), 
                                                [comp.format.toLowerCase()]: { link: mediaUrl } 
                                            }]
                                        });
                                    }
                                }
                            } else if (comp.type === 'BUTTONS') {
                                comp.buttons?.forEach((btn: any, index: number) => {
                                    if (btn.url?.includes('{{1}}') || btn.text?.includes('{{1}}')) {
                                        const varKey = `button_${index}_1`;
                                        const customVal = campaign.settings?.metaVariables?.[varKey];
                                        componentsPayload.push({
                                            type: 'button',
                                            sub_type: btn.type.toLowerCase() === 'url' ? 'url' : 'quick_reply',
                                            index: index.toString(),
                                            parameters: [{ type: 'text', text: customVal || contact.name?.trim() || 'cliente' }]
                                        });
                                    }
                                });
                            }
                        }
                    }

                    const templatePayload: any = {
                        name: templateName,
                        language: { code: templateLanguage || 'pt_BR' }
                    };

                    // Só anexa os components se tiver parâmetros para injetar
                    if (componentsPayload.length > 0) {
                        templatePayload.components = componentsPayload;
                    }

                    const sendStartTime = Date.now();
                    const result = await this.metaGraphApiService.sendMessage(
                        wabaAccount.phoneNumberId,
                        accessToken,
                        recipientPhone,
                        'template',
                        templatePayload
                    );
                    
                    const messageId = result?.messages?.[0]?.id;
                    this.logger.log(`✅ Template enviado via WABA para ${recipientPhone} (ID: ${messageId})`);

                    if (messageId) {
                        await this.inboxService.saveMessage({
                            tenantId,
                            remoteJid: `${recipientPhone}@s.whatsapp.net`,
                            remotePhone: recipientPhone,
                            remoteName: contact.name,
                            direction: 'outbound',
                            type: 'text', // Pode ser template/imagem na v2, mas 'text' é fallback
                            content: `[Template Meta Enviado: ${templateName}]`,
                            status: 'sent',
                            wamid: messageId,
                            campaignId,
                            contactId: contact.id,
                        }).catch(err => this.logger.error(`Failed to save WABA message to inbox: ${err.message}`));
                    }

                    const updateResult = await this.campaignContactRepo.update(
                        { id: campaignContactId, status: 'queued' }, // Only update if still queued
                        {
                            status: 'sent',
                            messageId,
                            sentAt: new Date(),
                            timingMetadata: { stackUsed: 'waba_api' },
                        } as any
                    );

                    // Só incrementa no painel se este for realmente o primeiro envio deste contato
                    if (updateResult.affected && updateResult.affected > 0) {
                        await this.campaignRepo.increment({ id: campaignId }, 'sentCount', 1);
                    }
                    
                    await this.checkCampaignCompletion(campaignId);

                    return { success: true, messageId, stackUsed: 'waba_api' as any };
                } catch (sendError) {
                    this.logger.error(`❌ Erro ao enviar WABA template: ${sendError.message}`);
                    throw sendError;
                }
            }

            // Se chegou aqui e não tem instância, é um erro de lógica
            if (!instance) {
                throw new Error('NO_AVAILABLE_INSTANCE');
            }

            // 4. Sortear Variação de Texto first (needed for routing input)
            if (campaign.flowId) {
                // 4.1 Apply Delay for Flow Campaigns
                const warmupDay = instance.warmupDay || 14;
                const warmupDelays = this.delayGenerator.calculateWarmupDelay(
                    warmupDay,
                    campaign?.minDelayMs ? campaign.minDelayMs / 1000 : 30, // Default 30s
                    campaign?.maxDelayMs ? campaign.maxDelayMs / 1000 : 90, // Default 90s
                );

                const delaySeconds = this.delayGenerator.generateGaussianDelay(
                    warmupDelays.minSeconds,
                    warmupDelays.maxSeconds
                );
                const delayMs = Math.round(delaySeconds * 1000);

                this.logger.log(`⏳ Flow Campaign: Waiting ${delayMs}ms (${(delayMs / 1000).toFixed(1)}s) before starting flow for contact ${contact.id} (Warmup Day: ${warmupDay}, Range: ${warmupDelays.minSeconds}s-${warmupDelays.maxSeconds}s)`);
                await new Promise(resolve => setTimeout(resolve, delayMs));

                this.logger.log(`🌀 Executing Flow ${campaign.flowId} for contact ${contact.id}`);

                try {
                    await this.flowsService.startExecution(tenantId, {
                        flowId: campaign.flowId,
                        contactId: contact.id,
                        instanceId: instance.id,
                        initialVariables: {
                            campaignId: campaign.id,
                            campaignContactId: campaignContactId
                        }
                    });

                    // Atualizar status para sent (delegado para o fluxo) + salvar timing metadata
                    await this.campaignContactRepo.update(campaignContactId, {
                        status: 'sent',
                        instanceId: instance.id,
                        sentAt: new Date(),
                        timingMetadata: {
                            delayBeforeSendMs: delayMs,
                            warmupDay,
                            warmupDelayRange: `${warmupDelays.minSeconds}s-${warmupDelays.maxSeconds}s`,
                            stackUsed: instance.provider,
                        },
                    } as any);

                    // Incrementar contadores
                    await this.instanceRepo.increment({ id: instance.id }, 'dailySent', 1);
                    await this.campaignRepo.increment({ id: campaignId }, 'sentCount', 1);

                    await this.checkCampaignCompletion(campaignId);

                    return { success: true };
                } catch (flowError) {
                    this.logger.error(`❌ Erro ao iniciar fluxo: ${flowError.message}`);
                    throw flowError;
                }
            }

            const variation = await this.selectVariation(campaignId);

            // 5. Aplicar Pattern Breaking (quebra de padrão)
            const contactName = contact.name || 'Cliente';
            const brokenMessage = this.patternBreaker.breakPattern(
                variation.content,
                contactName,
                {
                    greetingStyle: campaign?.settings?.greetingStyle || 'mixed',
                    enableEmojiRandomization: true,
                    enablePunctuationVariation: true,
                }
            );

            const finalContent = brokenMessage.content;

            // Check history for first contact
            const previousHistory = await this.campaignContactRepo.count({
                where: { contactId: contact.id, status: 'sent' }
            });

            const routingInput: StackRoutingInput = {
                instanceId: instance.id,
                warmupDays: instance.warmupDay || 0,
                chipHealthScore: this.calculateChipHealthScore(instance),
                campaignId: campaign.id,
                campaignVolume: campaign.totalContacts || 0,
                messagesSentToday: instance.dailySent || 0,
                messagesRemaining: (campaign.totalContacts || 0) - (campaign.sentCount || 0),
                riskLevel: this.assessRiskLevel(instance, campaign),
                conversationActive: false, // Feature futura: Integrar com histórico de chat para detectar conversas ativas
                isFirstContactMessage: previousHistory === 0,
                contentHasLinks: finalContent?.includes('http') || false,
            };

            const routingResult = this.stackRouter.route(routingInput);

            this.logger.log(
                `🎯 Stack Router Analytics: ${routingResult.selectedStack} (${routingResult.confidence}%) ` +
                `| Reason: ${routingResult.reason} | ACTUAL PROVIDER: ${instance.provider}`
            );

            // IMPORTANTE: Sempre usar o provider da instância selecionada, NÃO o stack router!
            // O Stack Router é apenas para analytics e logging.
            const provider = this.whatsAppFactory.getProvider(instance.provider as any);

            this.logger.debug(
                `🎭 Pattern Breaking: hash=${brokenMessage.contentHash}, ` +
                `transforms=[${brokenMessage.transformationsApplied.join(', ')}]`
            );

            // 6. Calcular delays com warmup consideration
            const warmupDay = instance.warmupDay || 14; // Se não tem warmup, assume maduro
            const warmupDelays = this.delayGenerator.calculateWarmupDelay(
                warmupDay,
                campaign?.minDelayMs ? campaign.minDelayMs / 1000 : 30,
                campaign?.maxDelayMs ? campaign.maxDelayMs / 1000 : 90,
            );

            // 7. Simular Comportamento Humano (HBS)
            this.logger.log(`⏳ Simulando comportamento humano para ${contact.phone}...`);

            const timing = await this.humanBehavior.simulateHumanBehavior(
                finalContent,
                {
                    typing: {
                        minWPM: 25,
                        maxWPM: 55,
                        avgCharsPerWord: 5,
                    },
                    delays: {
                        minSeconds: warmupDelays.minSeconds,
                        maxSeconds: warmupDelays.maxSeconds,
                        jitterPercent: 15,
                    },
                },
                {
                    // Callback para simular "digitando" no WhatsApp
                    onTypingStart: async () => {
                        try {
                            await provider.sendPresence?.(instance.instanceName, contact.phone, 'composing', 3000);
                        } catch (e) {
                            // Ignorar erros de presença
                        }
                    },
                    onTypingEnd: async () => {
                        try {
                            await provider.sendPresence?.(instance.instanceName, contact.phone, 'paused', 0);
                        } catch (e) {
                            // Ignorar erros de presença
                        }
                    },
                }
            );

            this.logger.log(
                `⏱️ HBS Timing: typing=${timing.typingDurationMs}ms, ` +
                `delay=${timing.delayBeforeSendMs}ms, total=${timing.totalWaitMs}ms, ` +
                `wpm=${timing.wpmUsed}`
            );

            // 8. Enviar Mensagem
            this.logger.log(`📤 Enviando mensagem para ${contact.phone} via ${instance.instanceName}`);

            // APLICAR PREVENÇÃO ATIVA (Telemetria de Bateria/Movimento)
            await this.activePrevention.applyPrevention(instance.id);

            let messageId: string | undefined;
            const sendStartTime = Date.now();
            try {
                const result = await provider.sendText(
                    instance.instanceName,
                    contact.phone,
                    finalContent,
                );
                messageId = result?.messageId;
                console.log(`📡 [DISPATCHER-DEBUG] Provider response for ${contact.phone}:`, JSON.stringify(result));
                this.logger.log(`✅ Mensagem enviada via ${instance.provider} para ${contact.phone} (ID: ${messageId})`);

                if (messageId) {
                    await this.inboxService.saveMessage({
                        tenantId,
                        instanceId: instance.id,
                        instanceName: instance.instanceName,
                        remoteJid: `${contact.phone}@s.whatsapp.net`,
                        remotePhone: contact.phone,
                        remoteName: contact.name,
                        direction: 'outbound',
                        type: 'text',
                        content: finalContent,
                        status: 'sent',
                        wamid: messageId,
                        campaignId,
                        contactId: contact.id,
                    }).catch(err => this.logger.error(`Failed to save outbound message to inbox: ${err.message}`));
                }

                // 📊 Record analytics - SUCCESS
                this.analytics.recordSent(
                    instance.id,
                    campaignId,
                    contact.id,
                    instance.provider as any,
                    Date.now() - sendStartTime
                );
            } catch (sendError) {
                this.logger.error(`❌ Erro ao enviar via ${instance.provider}: ${sendError.message}`);

                // 📊 Record analytics - FAILURE
                this.analytics.recordFailed(
                    instance.id,
                    campaignId,
                    contact.id,
                    instance.provider as any,
                    sendError.code || 'SEND_ERROR',
                    sendError.message
                );

                throw sendError;
            }

            // 9. Atualizar Status
            await this.campaignContactRepo.update(campaignContactId, {
                status: 'sent',
                instanceId: instance.id,
                variationId: variation.id,
                messageId, // Savor o messageId para rastreamento de status (entregue/lido)
                sentAt: new Date(),
                contentHash: brokenMessage.contentHash,
                timingMetadata: {
                    typingDurationMs: timing.typingDurationMs,
                    delayBeforeSendMs: timing.delayBeforeSendMs,
                    jitterAppliedMs: timing.jitterAppliedMs,
                    totalWaitMs: timing.totalWaitMs,
                    wpmUsed: timing.wpmUsed,
                    warmupDay,
                    stackUsed: instance.provider,
                    stackConfidence: routingResult.confidence,
                },
            } as any);

            // 10. Incrementar contadores
            await this.instanceRepo.increment({ id: instance.id }, 'dailySent', 1);
            await this.variationRepo.increment({ id: variation.id }, 'useCount', 1);
            await this.campaignRepo.increment({ id: campaignId }, 'sentCount', 1);

            this.logger.log(
                `✅ Message sent: ${campaignContactId} via ${instance.phone} ` +
                `(total wait: ${timing.totalWaitMs}ms, warmup day: ${warmupDay})`
            );


            await this.checkCampaignCompletion(campaignId);

            return {
                success: true,
                messageId,
                timing,
                stackUsed: instance.provider as any,
                stackConfidence: routingResult.confidence,
            };

        } catch (error) {
            this.logger.error(`❌ Failed to process ${campaignContactId}: ${error.message}`);

            // Atualizar como falha
            await this.campaignContactRepo.update(campaignContactId, {
                status: 'failed',
                errorMessage: error.message,
                failedAt: new Date(),
            });

            // Incrementar retry count
            await this.campaignContactRepo
                .createQueryBuilder()
                .update()
                .set({ retryCount: () => 'retry_count + 1' })
                .where('id = :id', { id: campaignContactId })
                .execute();

            // Incrementar failed_count da campanha
            await this.campaignRepo.increment({ id: campaignId }, 'failedCount', 1);

            // Verificar conclusão mesmo em caso de erro
            await this.checkCampaignCompletion(campaignId);

            // Re-throw para BullMQ gerenciar retry
            if (error.message === 'NO_AVAILABLE_INSTANCE') {
                throw error;
            }

            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Verifica se a campanha terminou e atualiza status.
     * Conta diretamente na tabela campaign_contacts para evitar race conditions
     * com os increments concorrentes em sentCount/failedCount.
     */
    private async checkCampaignCompletion(campaignId: string) {
        try {
            const campaign = await this.campaignRepo.findOne({
                where: { id: campaignId },
                select: ['id', 'tenantId', 'totalContacts', 'sentCount', 'failedCount', 'status']
            });

            if (!campaign || campaign.status !== 'running') return;

            // Contar diretamente dos campaign_contacts (fonte da verdade)
            const processedCount = await this.campaignContactRepo.count({
                where: [
                    { campaignId, status: 'sent' },
                    { campaignId, status: 'delivered' },
                    { campaignId, status: 'read' },
                    { campaignId, status: 'failed' },
                ]
            });

            if (processedCount >= campaign.totalContacts) {
                this.logger.log(`🏁 Campanha ${campaignId} concluída! (${processedCount}/${campaign.totalContacts})`);

                await this.campaignRepo.update(campaignId, {
                    status: 'completed',
                    completedAt: new Date()
                });

                if (this.eventsGateway) {
                    this.eventsGateway.emitToTenant(campaign.tenantId, 'campaign.updated', {
                        id: campaignId,
                        status: 'completed',
                        sentCount: campaign.sentCount,
                        failedCount: campaign.failedCount
                    });
                }
            }
        } catch (err) {
            this.logger.error(`Erro ao verificar conclusão da campanha: ${err.message}`);
        }
    }

    /**
     * Seleção de Instância - Round-Robin ou Single
     */
    /**
     * Returns the effective daily limit for an instance, considering warmup.
     * If warmup is enabled and user hasn't overridden, uses the warmup limit.
     * Otherwise uses the configured dailyLimit.
     */
    private getEffectiveLimit(instance: Instance): { limit: number; isWarmupLimit: boolean } {
        if (instance.warmupEnabled && instance.warmupDay !== undefined && instance.warmupDay > 0) {
            const hasOverride = this.warmupOverrides.has(instance.id);
            if (!hasOverride) {
                const warmupLimit = this.getWarmupDailyLimit(instance.warmupDay);
                return { limit: warmupLimit, isWarmupLimit: true };
            }
        }
        return { limit: instance.dailyLimit || 200, isWarmupLimit: false };
    }

    /**
     * Emits a warmup alert to the user via WebSocket.
     * Throttled: only sends once per instance per 10 minutes.
     */
    private emitWarmupAlert(
        tenantId: string,
        instance: Instance,
        campaignId: string,
        alertType: 'warning' | 'limit_reached' | 'all_chips_exhausted',
        details: Record<string, any>,
    ) {
        const throttleKey = `${instance.id}-${alertType}`;
        const lastSent = this.warmupAlertSent.get(throttleKey);
        const now = Date.now();

        // Throttle: don't send same alert for same instance within 10 minutes
        if (lastSent && (now - lastSent) < 10 * 60 * 1000) {
            return;
        }

        this.warmupAlertSent.set(throttleKey, now);

        if (this.eventsGateway) {
            this.eventsGateway.emitToTenant(tenantId, 'warmup.alert', {
                type: alertType,
                instanceId: instance.id,
                instanceName: instance.instanceName,
                instancePhone: instance.phone,
                campaignId,
                warmupDay: instance.warmupDay,
                dailySent: instance.dailySent,
                ...details,
                timestamp: new Date().toISOString(),
            });
        }

        this.logger.warn(
            `🚨 [WARMUP ALERT] ${alertType.toUpperCase()} | Instance: ${instance.instanceName} ` +
            `| Sent: ${instance.dailySent} | ${JSON.stringify(details)}`
        );
    }

    /**
     * Called by the campaigns controller when user responds to a warmup alert.
     * action: 'override' = allow this instance to exceed warmup limit for today
     * action: 'pause' = keep the instance paused (default behavior)
     */
    public handleWarmupLimitResponse(instanceId: string, action: 'override' | 'pause') {
        if (action === 'override') {
            this.warmupOverrides.set(instanceId, Date.now());
            this.logger.warn(`⚠️ User OVERRODE warmup limit for instance ${instanceId}. Sending will continue beyond warmup limit.`);
        } else {
            this.warmupOverrides.delete(instanceId);
            this.logger.log(`✅ User confirmed warmup pause for instance ${instanceId}.`);
        }
    }

    /**
     * Seleção de Instância - Round-Robin com proteção de warmup
     * Agora RESPEITA os limites de warmup e emite alertas ao usuário
     */
    private async selectInstance(tenantId: string, campaignInstanceId?: string, campaignInstanceIds?: string[], campaignId?: string): Promise<Instance | null> {
        const WARNING_THRESHOLD = 0.80; // Alert at 80% of limit

        // Se tiver múltiplos IDs, usar Round-Robin com fallback inteligente
        if (campaignInstanceIds && campaignInstanceIds.length > 0) {
            const currentIndex = this.instanceIndex.get(tenantId) || 0;
            const totalInstances = campaignInstanceIds.length;
            let skippedInstances: Array<{ name: string; reason: string; sent: number; limit: number }> = [];

            // Tentar TODAS as instâncias da lista antes de desistir
            for (let attempt = 0; attempt < totalInstances; attempt++) {
                const idx = (currentIndex + attempt) % totalInstances;
                const candidateId = campaignInstanceIds[idx];

                const instance = await this.instanceRepo.findOne({
                    where: { id: candidateId, tenantId },
                    relations: ['proxy'],
                });

                if (!instance) {
                    this.logger.warn(`🔄 Round-Robin: Instance ${candidateId} not found, skipping...`);
                    continue;
                }

                if (instance.status !== 'connected') {
                    this.logger.warn(`🔄 Round-Robin: Instance ${instance.instanceName} not connected (status: ${instance.status}), skipping...`);
                    skippedInstances.push({ name: instance.instanceName, reason: 'disconnected', sent: instance.dailySent || 0, limit: 0 });
                    continue;
                }

                // === WARMUP LIMIT ENFORCEMENT ===
                const { limit: effectiveLimit, isWarmupLimit } = this.getEffectiveLimit(instance);
                const currentSent = instance.dailySent || 0;
                const usageRatio = currentSent / effectiveLimit;

                // CHECK: Instance at or over limit -> SKIP and try next
                if (currentSent >= effectiveLimit) {
                    this.logger.warn(
                        `🛑 Instance ${instance.instanceName} OVER ${isWarmupLimit ? 'warmup' : 'daily'} limit ` +
                        `(${currentSent}/${effectiveLimit}). Skipping to next chip...`
                    );

                    if (campaignId) {
                        this.emitWarmupAlert(tenantId, instance, campaignId, 'limit_reached', {
                            effectiveLimit,
                            isWarmupLimit,
                            message: `Chip ${instance.instanceName} (${instance.phone}) atingiu o limite ` +
                                `${isWarmupLimit ? 'de warmup' : 'diário'}: ${currentSent}/${effectiveLimit} mensagens. ` +
                                `Redistribuindo para outros chips disponíveis.`,
                            remainingChips: totalInstances - attempt - 1,
                        });
                    }

                    skippedInstances.push({
                        name: instance.instanceName,
                        reason: isWarmupLimit ? 'warmup_limit' : 'daily_limit',
                        sent: currentSent,
                        limit: effectiveLimit,
                    });
                    continue;
                }

                // WARNING: Instance approaching limit -> Alert but still use
                if (usageRatio >= WARNING_THRESHOLD && isWarmupLimit && campaignId) {
                    const remaining = effectiveLimit - currentSent;
                    this.emitWarmupAlert(tenantId, instance, campaignId, 'warning', {
                        effectiveLimit,
                        isWarmupLimit,
                        usagePercent: Math.round(usageRatio * 100),
                        remainingMessages: remaining,
                        message: `⚠️ Chip ${instance.instanceName} (${instance.phone}) está em ${Math.round(usageRatio * 100)}% ` +
                            `do limite de warmup (dia ${instance.warmupDay}): ${currentSent}/${effectiveLimit}. ` +
                            `Restam apenas ${remaining} mensagens antes de atingir o limite.`,
                    });
                }

                // Atualizar índice para a PRÓXIMA instância na rotação
                this.instanceIndex.set(tenantId, idx + 1);

                this.logger.log(
                    `✅ Using campaign instance: ${instance.instanceName} (${instance.provider}) - ` +
                    `${currentSent}/${effectiveLimit} messages today ` +
                    `(${isWarmupLimit ? `warmup day ${instance.warmupDay}` : 'daily'}, ` +
                    `Round-Robin index: ${idx})`
                );

                return instance;
            }

            // ALL instances exhausted — alert user and return null
            this.logger.error(`❌ No available instance found among ${totalInstances} configured instances for tenant ${tenantId}`);

            if (campaignId && skippedInstances.length > 0) {
                // Use a dummy instance for the alert
                const dummyInstance = { id: 'all', instanceName: 'Todos os chips', phone: '', warmupDay: 0, dailySent: 0 } as Instance;
                this.emitWarmupAlert(tenantId, dummyInstance, campaignId, 'all_chips_exhausted', {
                    message: `🛑 TODOS os chips atingiram seus limites de warmup! ` +
                        `A campanha será pausada automaticamente para proteger a saúde dos chips. ` +
                        `Você pode adicionar mais chips ou permitir que algum chip continue enviando acima do limite.`,
                    skippedInstances,
                    action: 'campaign_auto_paused',
                });

                // Auto-pause the campaign to protect chip health
                try {
                    await this.campaignRepo.update(campaignId, { status: 'paused' });
                    this.eventsGateway?.emitToTenant(tenantId, 'campaign.updated', {
                        id: campaignId,
                        status: 'paused',
                        reason: 'warmup_limit_all_chips',
                    });
                    this.logger.warn(`⏸️ Campaign ${campaignId} AUTO-PAUSED: all chips exhausted warmup limits`);
                } catch (err) {
                    this.logger.error(`Failed to auto-pause campaign: ${err.message}`);
                }
            }

            return null;
        }

        // Fallback para instanceId único (deprecated)
        const targetInstanceId = campaignInstanceId;
        if (!targetInstanceId) {
            this.logger.error('Campaign has no instance configured!');
            return null;
        }

        const instance = await this.instanceRepo.findOne({
            where: { id: targetInstanceId, tenantId },
            relations: ['proxy'],
        });

        if (!instance) {
            this.logger.error(`Instance ${targetInstanceId} not found for tenant ${tenantId}`);
            return null;
        }

        if (instance.status !== 'connected') {
            this.logger.warn(`Instance ${instance.instanceName} is not connected (status: ${instance.status})`);
            return null;
        }

        // === WARMUP LIMIT ENFORCEMENT (single instance) ===
        const { limit: effectiveLimit, isWarmupLimit } = this.getEffectiveLimit(instance);
        const currentSent = instance.dailySent || 0;

        if (currentSent >= effectiveLimit) {
            this.logger.warn(
                `🛑 Single instance ${instance.instanceName} OVER ${isWarmupLimit ? 'warmup' : 'daily'} limit ` +
                `(${currentSent}/${effectiveLimit}).`
            );

            if (campaignId) {
                this.emitWarmupAlert(tenantId, instance, campaignId, 'limit_reached', {
                    effectiveLimit,
                    isWarmupLimit,
                    message: `🛑 Chip ${instance.instanceName} (${instance.phone}) atingiu o limite ` +
                        `${isWarmupLimit ? 'de warmup' : 'diário'}: ${currentSent}/${effectiveLimit}. ` +
                        `Não há outros chips disponíveis. A campanha será pausada.`,
                    remainingChips: 0,
                });

                // Auto-pause the campaign
                try {
                    await this.campaignRepo.update(campaignId, { status: 'paused' });
                    this.eventsGateway?.emitToTenant(tenantId, 'campaign.updated', {
                        id: campaignId,
                        status: 'paused',
                        reason: 'warmup_limit_single_chip',
                    });
                    this.logger.warn(`⏸️ Campaign ${campaignId} AUTO-PAUSED: single chip exhausted`);
                } catch (err) {
                    this.logger.error(`Failed to auto-pause campaign: ${err.message}`);
                }
            }

            return null;
        }

        // Warning at 80%
        const usageRatio = currentSent / effectiveLimit;
        if (usageRatio >= WARNING_THRESHOLD && isWarmupLimit && campaignId) {
            const remaining = effectiveLimit - currentSent;
            this.emitWarmupAlert(tenantId, instance, campaignId, 'warning', {
                effectiveLimit,
                isWarmupLimit,
                usagePercent: Math.round(usageRatio * 100),
                remainingMessages: remaining,
                message: `⚠️ Chip ${instance.instanceName} (${instance.phone}) está em ${Math.round(usageRatio * 100)}% ` +
                    `do limite de warmup (dia ${instance.warmupDay}): ${currentSent}/${effectiveLimit}. ` +
                    `Restam apenas ${remaining} mensagens. Não há outros chips configurados.`,
            });
        }

        this.logger.log(
            `✅ Using campaign instance: ${instance.instanceName} (${instance.provider}) - ` +
            `${currentSent}/${effectiveLimit} messages today (${isWarmupLimit ? `warmup day ${instance.warmupDay}` : 'daily'})`
        );

        return instance;
    }

    /**
     * Verifica se instância está disponível para envio
     * Considera limite diário e warmup
     */
    private isInstanceAvailable(instance: Instance): boolean {
        // 1. Verificar limite diário
        if (instance.dailySent >= instance.dailyLimit) {
            return false;
        }

        // 2. Verificar limite de warmup (se em warmup)
        if (instance.warmupEnabled && instance.warmupDay !== undefined) {
            const warmupLimit = this.getWarmupDailyLimit(instance.warmupDay);
            if (instance.dailySent >= warmupLimit) {
                this.logger.debug(
                    `Instance ${instance.instanceName} atingiu limite de warmup ` +
                    `(${instance.dailySent}/${warmupLimit}) no dia ${instance.warmupDay}`
                );
                return false;
            }
        }

        return true;
    }

    /**
     * Retorna limite diário baseado no dia de warmup
     */
    private getWarmupDailyLimit(warmupDay: number): number {
        const limits: Record<number, number> = {
            1: 5,
            2: 8,
            3: 12,
            4: 18,
            5: 25,
            6: 35,
            7: 45,
            8: 60,
            9: 70,
            10: 80,
            11: 90,
            12: 100,
            13: 120,
            14: 150,
        };

        return limits[warmupDay] || 200; // Após dia 14, limite alto
    }

    /**
     * Calcula o Health Score do chip baseado em métricas
     * @returns Score de 0-100
     */
    private calculateChipHealthScore(instance: Instance): number {
        let score = 50; // Base score

        // Bonus por warmup completo
        const warmupDays = instance.warmupDay || 0;
        if (warmupDays >= 14) {
            score += 20;
        } else if (warmupDays >= 7) {
            score += 10;
        }

        // Bonus por baixo uso diário (não sobrecarregado)
        const usageRatio = (instance.dailySent || 0) / (instance.dailyLimit || 100);
        if (usageRatio < 0.5) {
            score += 15;
        } else if (usageRatio < 0.8) {
            score += 5;
        } else {
            score -= 10; // Penalidade por alta carga
        }

        // Bonus por conexão estável
        if (instance.status === 'connected') {
            score += 15;
        }

        // Garantir range 0-100
        return Math.max(0, Math.min(100, score));
    }

    /**
     * Avalia o nível de risco da operação
     */
    private assessRiskLevel(instance: Instance, campaign: Campaign): 'low' | 'medium' | 'high' | 'critical' {
        // Chip muito novo = risco alto
        if ((instance.warmupDay || 0) < 7) {
            return 'high';
        }

        // Alta carga = risco médio
        const usageRatio = (instance.dailySent || 0) / (instance.dailyLimit || 100);
        if (usageRatio > 0.9) {
            return 'high';
        }

        if (usageRatio > 0.7) {
            return 'medium';
        }

        // Campanha muito grande = risco médio
        if ((campaign.totalContacts || 0) > 1000) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Mapeia o stack selecionado para o provider disponível
     * Fallback para o provider da instância se o stack ideal não estiver disponível
     */
    private mapStackToProvider(
        selectedStack: StackType,
        instanceProvider: string
    ): 'waha' | 'evolution' {
        // Mapeamento de stack para provider
        const stackToProvider: Record<StackType, 'waha' | 'evolution'> = {
            wwebjs: 'evolution', // Fallback for legacy stack type
            waha: 'waha',
            evolution: 'evolution',
            official: 'evolution', // Official usa Evolution como gateway
        };

        const idealProvider = stackToProvider[selectedStack] as 'waha' | 'evolution';

        // Validar se o provider ideal está disponível no factory
        if (idealProvider && this.whatsAppFactory.isProviderAvailable(idealProvider)) {
            return idealProvider;
        }

        // Fallback para o provider da instância
        return (instanceProvider as 'waha' | 'evolution') || 'evolution';
    }

    /**
     * Seleção Aleatória de Variação (Anti-Spam)
     */
    private async selectVariation(campaignId: string): Promise<MessageVariation> {
        const variations = await this.variationRepo.find({
            where: { campaignId },
        });

        if (variations.length === 0) {
            throw new Error('No variations found for campaign');
        }

        // Ponderação inversa pelo uso (menos usados têm mais chance)
        const totalUse = variations.reduce((sum, v) => sum + (v.useCount || 0) + 1, 0);
        const weights = variations.map(v => totalUse - (v.useCount || 0));
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        let random = Math.random() * totalWeight;
        for (let i = 0; i < variations.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return variations[i];
            }
        }

        return variations[0];
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<DispatchJobData, DispatchResult>) {
        this.logger.debug(`Job ${job.id} completed`);
        const { tenantId, campaignId } = job.data;
        if (this.eventsGateway) {
            this.eventsGateway.emitToTenant(tenantId, 'dispatch.completed', {
                campaignId,
                success: job.returnvalue?.success ?? false,
                result: job.returnvalue
            });
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<DispatchJobData>, error: Error) {
        this.logger.error(`Job ${job.id} failed: ${error.message}`);
        const { tenantId, campaignId } = job.data;
        if (this.eventsGateway) {
            this.eventsGateway.emitToTenant(tenantId, 'dispatch.failed', {
                campaignId,
                error: error.message
            });
        }
    }
}
