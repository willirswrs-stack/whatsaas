import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Instance } from '../instances/entities/instance.entity';
import { Campaign, CampaignContact, MessageVariation } from '../campaigns/entities/campaign.entity';
import { Proxy } from '../instances/entities/instance.entity';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { DISPATCH_QUEUE } from '../../config/bull.config';

// Anti-Ban Services
import { HumanBehaviorService, TimingMetadata } from '../anti-ban/human-behavior.service';
import { PatternBreakerService } from '../anti-ban/pattern-breaker.service';
import { DelayGeneratorService } from '../anti-ban/delay-generator.service';
import { StackRouterService, StackRoutingInput, StackType } from '../anti-ban/stack-router.service';
import { AntiBanAnalyticsService } from '../anti-ban/analytics.service';

import { FlowsService } from '../flows/flows.service';
import { EventsGateway } from '../events/events.gateway';

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
    ) {
        super();
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

            // 3. Selecionar Instância
            const instance = await this.selectInstance(tenantId, campaign?.instanceId);
            if (!instance) {
                this.logger.warn(`No available instance for tenant ${tenantId}`);
                throw new Error('NO_AVAILABLE_INSTANCE');
            }

            // 4. Sortear Variação de Texto first (needed for routing input)
            if (campaign.flowId) {
                this.logger.log(`🌀 Executing Flow ${campaign.flowId} for contact ${contact.id}`);

                try {
                    await this.flowsService.startExecution(tenantId, {
                        flowId: campaign.flowId,
                        contactId: contact.id,
                        instanceId: instance.id
                    });

                    // Atualizar status para sent (delegado para o fluxo)
                    await this.campaignContactRepo.update(campaignContactId, {
                        status: 'sent',
                        instanceId: instance.id,
                        sentAt: new Date(),
                    } as any);

                    // Incrementar contadores
                    await this.instanceRepo.increment({ id: instance.id }, 'dailySent', 1);
                    await this.campaignRepo.increment({ id: campaignId }, 'sentCount', 1);

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

            let messageId: string | undefined;
            const sendStartTime = Date.now();
            try {
                const result = await provider.sendText(
                    instance.instanceName,
                    contact.phone,
                    finalContent,
                );
                messageId = result?.messageId;
                this.logger.log(`✅ Mensagem enviada via ${instance.provider} para ${contact.phone}`);

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
     * Verifica se a campanha terminou e atualiza status
     */
    private async checkCampaignCompletion(campaignId: string) {
        try {
            const campaign = await this.campaignRepo.findOne({
                where: { id: campaignId },
                select: ['id', 'tenantId', 'totalContacts', 'sentCount', 'failedCount', 'status']
            });

            if (!campaign) return;

            const processed = (campaign.sentCount || 0) + (campaign.failedCount || 0);

            if (campaign.status === 'running' && processed >= campaign.totalContacts) {
                this.logger.log(`🏁 Campanha ${campaignId} concluída! (${processed}/${campaign.totalContacts})`);

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
     * Seleção de Instância - USA APENAS a instância da campanha (SEM FALLBACK)
     * Se a instância não estiver disponível, retorna erro claro
     */
    private async selectInstance(tenantId: string, campaignInstanceId?: string): Promise<Instance | null> {
        // OBRIGATÓRIO: Campanha DEVE ter uma instância configurada
        if (!campaignInstanceId) {
            this.logger.error('Campaign has no instance configured!');
            return null;
        }

        const instance = await this.instanceRepo.findOne({
            where: {
                id: campaignInstanceId,
                tenantId,
            },
            relations: ['proxy'],
        });

        if (!instance) {
            this.logger.error(`Instance ${campaignInstanceId} not found for tenant ${tenantId}`);
            return null;
        }

        if (instance.status !== 'connected') {
            this.logger.error(`Instance ${instance.instanceName} is not connected (status: ${instance.status})`);
            return null;
        }

        // Verificar se é Evolution API (remover WWebJS)


        // Verificar limite diário (mas permitir continuar com aviso, não bloquear)
        if (instance.dailySent >= instance.dailyLimit) {
            this.logger.warn(
                `Instance ${instance.instanceName} reached daily limit (${instance.dailySent}/${instance.dailyLimit}). ` +
                `Consider increasing the limit or waiting until tomorrow.`
            );
            // NÃO retornar null - apenas avisar mas continuar
        }

        this.logger.log(
            `✅ Using campaign instance: ${instance.instanceName} (${instance.provider}) - ` +
            `${instance.dailySent}/${instance.dailyLimit} messages today`
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
