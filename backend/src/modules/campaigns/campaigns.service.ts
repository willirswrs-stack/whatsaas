import { Injectable, NotFoundException, Inject, forwardRef, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { createHash } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

import {
    Campaign,
    CampaignContact,
    MessageVariation,
    Template,
} from './entities/campaign.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Flow } from '../flows/entities';
import { Instance } from '../instances/entities/instance.entity';
import { InstanceStatus } from '../../common/enums/instance-status.enum';
import { ContactsService } from '../contacts/contacts.service';
import { AiService } from '../ai/ai.service';
import { DispatcherService } from '../dispatcher/dispatcher.service';
import { SettingsService } from '../settings/settings.service';
import { SCHEDULER_QUEUE } from '../../config/bull.config';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';

@Injectable()
export class CampaignsService {
    private readonly logger = new Logger(CampaignsService.name);

    constructor(
        @InjectRepository(Campaign)
        private campaignRepo: Repository<Campaign>,
        @InjectRepository(CampaignContact)
        private campaignContactRepo: Repository<CampaignContact>,
        @InjectRepository(MessageVariation)
        private variationRepo: Repository<MessageVariation>,
        @InjectRepository(Contact)
        private contactRepo: Repository<Contact>,
        @InjectRepository(Template)
        private templateRepo: Repository<Template>,
        @InjectRepository(Flow)
        private flowRepo: Repository<Flow>,
        @InjectQueue(SCHEDULER_QUEUE) private schedulerQueue: Queue,
        private aiService: AiService,
        private dispatcherService: DispatcherService,
        @Inject(forwardRef(() => SettingsService))
        private settingsService: SettingsService,
        private readonly contactsService: ContactsService,
        private whatsAppFactory: WhatsAppProviderFactory,
    ) { }

    async findAll(tenantId: string, query?: PaginationQueryDto) {
        const page = Number(query?.page) || 1;
        const limit = Number(query?.limit) || 10;
        const skip = (page - 1) * limit;

        const [data, total] = await this.campaignRepo.findAndCount({
            where: { tenantId },
            relations: ['template'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip,
        });

        return {
            data,
            meta: {
                total,
                page,
                last_page: Math.ceil(total / limit),
                limit,
            },
        };
    }

    async findOne(id: string, tenantId: string) {
        const campaign = await this.campaignRepo.findOne({
            where: { id, tenantId },
            relations: ['template', 'variations'],
        });

        if (!campaign) {
            throw new NotFoundException('Campaign not found');
        }

        return campaign;
    }

    async create(tenantId: string, data: Partial<Campaign> & {
        contactIds?: string[];
        tagIds?: string[];
        minDelaySec?: number;
        maxDelaySec?: number;
    }) {
        const { contactIds: providedIds = [], tagIds = [], minDelaySec, maxDelaySec, ...campaignData } = data;
        let finalContactIds = new Set(providedIds);

        // Resolver contatos via Tags
        if (tagIds.length > 0) {
            this.logger.log(`Resolving contacts for tags: ${tagIds.join(', ')}`);
            // Busca contatos que tenham *qualquer* uma das tags
            const result = await this.contactsService.findAllContacts(tenantId, {
                tagIds,
                limit: 100000, // Limite alto para cobrir maioria dos casos
            });

            if (result.data) {
                result.data.forEach(c => finalContactIds.add(c.id));
                this.logger.log(`Found ${result.data.length} contacts via tags.`);
            }
        }

        const contactIdsArray = Array.from(finalContactIds);

        const campaign = this.campaignRepo.create({
            ...campaignData,
            tenantId,
            status: 'draft',
            totalContacts: contactIdsArray.length,
            minDelayMs: (minDelaySec || 5) * 1000,
            maxDelayMs: (maxDelaySec || 15) * 1000,
            // If instanceIds provided, use them. If only deprecated instanceId provided, wrap in array
            instanceIds: (campaignData.instanceIds?.length || 0) > 0
                ? campaignData.instanceIds
                : (campaignData.instanceId ? [campaignData.instanceId] : []),
            instanceId: campaignData.instanceId, // Keep for backward compat
        });

        const savedCampaign = await this.campaignRepo.save(campaign);

        // Vincular contatos à campanha
        if (contactIdsArray.length > 0) {
            // Bulk insert em chunks para evitar erro de memória/query size
            const chunkSize = 500;
            for (let i = 0; i < contactIdsArray.length; i += chunkSize) {
                const chunk = contactIdsArray.slice(i, i + chunkSize);
                const campaignContacts = chunk.map(contactId =>
                    this.campaignContactRepo.create({
                        campaignId: savedCampaign.id,
                        contactId,
                        status: 'queued',
                    })
                );
                await this.campaignContactRepo.save(campaignContacts);
            }
        }

        return savedCampaign;
    }

    async update(id: string, tenantId: string, data: Partial<Campaign> & {
        minDelaySec?: number;
        maxDelaySec?: number;
    }) {
        const campaign = await this.findOne(id, tenantId);

        if (campaign.status === 'completed' || campaign.status === 'cancelled') {
            throw new BadRequestException('Campanhas finalizadas ou canceladas não podem mais ser editadas.');
        }

        const { minDelaySec, maxDelaySec, ...updateData } = data;

        // Atualizar campos básicos
        Object.assign(campaign, updateData);

        // Atualizar delays se fornecidos
        if (minDelaySec !== undefined) campaign.minDelayMs = minDelaySec * 1000;
        if (maxDelaySec !== undefined) campaign.maxDelayMs = maxDelaySec * 1000;

        // Se instanceIds fornecidos, garantir que o deprecated instanceId também reflita o primeiro
        if (updateData.instanceIds && updateData.instanceIds.length > 0) {
            campaign.instanceId = updateData.instanceIds[0];
        }

        return this.campaignRepo.save(campaign);
    }

    async generateVariations(
        id: string,
        tenantId: string,
        options: { count: number; creativity?: number; provider?: 'openai' | 'anthropic' },
    ) {
        const campaign = await this.findOne(id, tenantId);

        if (!campaign.template) {
            throw new NotFoundException('Campaign has no template');
        }

        // Generate variations using AI
        const result = await this.aiService.generateVariations(
            campaign.template.content,
            options.count,
            options.creativity || 0.7,
            options.provider || 'openai',
        );

        // Save variations
        const variations = result.variations.map((content, index) => ({
            campaignId: id,
            variationIndex: index,
            content,
            contentHash: createHash('sha256').update(content).digest('hex'),
        }));

        await this.variationRepo.save(variations);

        // Update campaign
        await this.campaignRepo.update(id, {
            variationCount: variations.length,
        });

        return {
            variations,
            tokensUsed: result.tokensUsed,
        };
    }

    async start(id: string, tenantId: string) {
        const campaign = await this.findOne(id, tenantId);

        // Verificar se tem contatos
        const contactCount = await this.campaignContactRepo.count({
            where: { campaignId: id },
        });

        if (contactCount === 0) {
            throw new Error('Campanha não tem contatos. Adicione contatos antes de iniciar.');
        }

        // Se campanha usa fluxo, verificar e auto-ativar se necessário
        if (campaign.flowId) {
            const flow = await this.flowRepo.findOne({ where: { id: campaign.flowId } });
            if (!flow) {
                throw new BadRequestException(`Fluxo ${campaign.flowId} não encontrado.`);
            }
            if (flow.status !== 'active') {
                this.logger.log(`🔄 Auto-ativando fluxo "${flow.name}" (status era: ${flow.status}) para campanha ${id}`);
                await this.flowRepo.update(flow.id, { status: 'active' });
            }
        }

        // Verificar se pelo menos uma instância está conectada (com validação real no provedor)
        const instanceIds = campaign.instanceIds?.length > 0 ? campaign.instanceIds : (campaign.instanceId ? [campaign.instanceId] : []);
        if (instanceIds.length > 0) {
            let connectedCount = 0;
            const instances = await this.campaignRepo.manager.getRepository(Instance).find({
                where: { id: In(instanceIds) }
            });

            for (const instance of instances) {
                try {
                    const provider = this.whatsAppFactory.getProvider(instance.provider as any);
                    const status = await provider.getStatus(instance.instanceName);
                    
                    const mappedStatus = status.status as unknown as InstanceStatus;
                    if (instance.status !== mappedStatus) {
                        instance.status = mappedStatus;
                        if (mappedStatus === InstanceStatus.CONNECTED) {
                            instance.connectedAt = new Date();
                        }
                        await this.campaignRepo.manager.getRepository(Instance).save(instance);
                    }
                    
                    if (mappedStatus === InstanceStatus.CONNECTED) {
                        connectedCount++;
                    }
                } catch (err) {
                    this.logger.warn(`Falha ao obter status real da instância ${instance.instanceName}: ${err.message}`);
                    // Fallback para o status atual no banco
                    if (instance.status === InstanceStatus.CONNECTED) {
                        connectedCount++;
                    }
                }
            }

            if (connectedCount === 0) {
                throw new BadRequestException('Nenhum chip/número configurado para esta campanha está conectado. Por favor, conecte o chip antes de iniciar o disparo.');
            } else {
                this.logger.log(`✅ ${connectedCount}/${instanceIds.length} instâncias conectadas para campanha ${id}`);
            }
        }

        // Se não tem variações, criar variações (APENAS se não for campanha de fluxo)
        if ((!campaign.variations || campaign.variations.length === 0) && !campaign.flowId) {
            const baseContent = campaign.template?.content ||
                `Olá {{nome}}! Esta é uma mensagem da campanha ${campaign.name}.`;

            // Se AI Spin está habilitado, gerar variações via IA
            if (campaign.aiSpinEnabled && campaign.variationCount > 1) {
                try {
                    this.logger.log(`🤖 Gerando ${campaign.variationCount} variações via IA para campanha ${id}...`);

                    // Buscar API key do tenant
                    const openaiKey = await this.settingsService.getOpenAIKey(tenantId);

                    const result = await this.aiService.generateVariationsWithKey(
                        baseContent,
                        campaign.variationCount,
                        openaiKey,
                        'openai',
                        0.7
                    );

                    const variations = result.variations.map((content, index) =>
                        this.variationRepo.create({
                            campaignId: id,
                            variationIndex: index,
                            content,
                            contentHash: Buffer.from(content).toString('base64').substring(0, 32),
                        })
                    );
                    await this.variationRepo.save(variations);
                    this.logger.log(`✅ ${variations.length} variações criadas via IA (${result.tokensUsed} tokens)`);

                    // Atualizar contagem na campanha
                    await this.campaignRepo.update(id, { variationCount: variations.length });
                } catch (err: any) {
                    this.logger.warn(`⚠️ Erro ao gerar variações IA: ${err.message}, usando padrão`);
                    // Fallback: criar variação padrão
                    const defaultVariation = this.variationRepo.create({
                        campaignId: id,
                        variationIndex: 0,
                        content: baseContent,
                        contentHash: Buffer.from(baseContent).toString('base64').substring(0, 32),
                    });
                    await this.variationRepo.save(defaultVariation);
                }
            } else {
                // AI Spin desabilitado - usar apenas o template original
                const defaultVariation = this.variationRepo.create({
                    campaignId: id,
                    variationIndex: 0,
                    content: baseContent,
                    contentHash: Buffer.from(baseContent).toString('base64').substring(0, 32),
                });
                await this.variationRepo.save(defaultVariation);
                this.logger.log(`📝 Variação padrão criada para campanha ${id}`);
            }
        }

        // Atualizar status para running
        await this.campaignRepo.update(id, {
            status: 'running',
            startedAt: new Date(),
        });

        // Enfileirar para envio
        try {
            const enqueued = await this.dispatcherService.enqueueCampaign(id, tenantId);
            this.logger.log(`📤 ${enqueued} mensagens enfileiradas para campanha ${id}`);
        } catch (err: any) {
            this.logger.error(`⚠️ Erro ao enfileirar campanha ${id}: ${err.message}`);
        }

        return this.findOne(id, tenantId);
    }

    async schedule(id: string, tenantId: string, scheduledAtStr: string) {
        const campaign = await this.findOne(id, tenantId);

        const scheduledAt = new Date(scheduledAtStr);
        if (isNaN(scheduledAt.getTime())) {
            throw new BadRequestException('Data de agendamento inválida.');
        }

        const now = new Date();
        if (scheduledAt <= now) {
            throw new BadRequestException('A data de agendamento deve estar no futuro.');
        }

        // Verificar se tem contatos
        const contactCount = await this.campaignContactRepo.count({
            where: { campaignId: id },
        });

        if (contactCount === 0) {
            throw new BadRequestException('Campanha não tem contatos. Adicione contatos antes de agendar.');
        }

        const delay = scheduledAt.getTime() - now.getTime();

        // Enqueue the job with delay
        await this.schedulerQueue.add(
            'start-campaign',
            { campaignId: id, tenantId },
            { delay, jobId: `schedule-campaign-${id}` } // Remove previous if any
        );

        // Update campaign status
        await this.campaignRepo.update(id, {
            status: 'scheduled',
            scheduledAt,
        });

        this.logger.log(`⏰ Campanha ${id} agendada para ${scheduledAt.toISOString()} (em ${Math.round(delay / 1000)}s)`);

        return this.findOne(id, tenantId);
    }

    async pause(id: string, tenantId: string) {
        await this.findOne(id, tenantId); // Verify ownership
        await this.dispatcherService.pauseCampaign(id);
        return this.findOne(id, tenantId);
    }

    async resume(id: string, tenantId: string) {
        await this.findOne(id, tenantId); // Verify ownership
        const queuedCount = await this.dispatcherService.resumeCampaign(id, tenantId);
        return {
            campaign: await this.findOne(id, tenantId),
            queuedMessages: queuedCount,
        };
    }

    async getStats(id: string, tenantId: string) {
        await this.findOne(id, tenantId); // Verify ownership
        return this.dispatcherService.getCampaignStats(id);
    }

    async cancel(id: string, tenantId: string) {
        await this.findOne(id, tenantId); // Verify ownership
        await this.campaignRepo.update(id, { status: 'cancelled' });
        // Stop any pending dispatches
        try {
            await this.dispatcherService.pauseCampaign(id);
        } catch {
            // Ignore if campaign wasn't running
        }
        return this.findOne(id, tenantId);
    }

    async delete(id: string, tenantId: string) {
        const campaign = await this.findOne(id, tenantId);

        // Delete related records first
        await this.campaignContactRepo.delete({ campaignId: id });
        await this.variationRepo.delete({ campaignId: id });

        // Delete the campaign
        await this.campaignRepo.remove(campaign);
        return { deleted: true };
    }

    async duplicate(id: string, tenantId: string) {
        const original = await this.findOne(id, tenantId);

        // Get original campaign contacts
        const originalContacts = await this.campaignContactRepo.find({
            where: { campaignId: id },
            select: ['contactId'],
        });

        // Create new campaign with same settings but reset status
        const newCampaign = this.campaignRepo.create({
            tenantId,
            name: `${original.name} (Cópia)`,
            templateId: original.templateId,
            flowId: original.flowId,
            instanceId: original.instanceId,
            status: 'draft',
            aiSpinEnabled: original.aiSpinEnabled,
            variationCount: original.variationCount,
            minDelayMs: original.minDelayMs,
            maxDelayMs: original.maxDelayMs,
            settings: original.settings,
            totalContacts: originalContacts.length,
        });

        const savedCampaign = await this.campaignRepo.save(newCampaign);

        // Copy contacts to new campaign
        if (originalContacts.length > 0) {
            const copiedContacts = originalContacts.map(cc =>
                this.campaignContactRepo.create({
                    campaignId: savedCampaign.id,
                    contactId: cc.contactId,
                    status: 'queued',
                })
            );
            await this.campaignContactRepo.save(copiedContacts);
        }

        this.logger.log(`📋 Campaign ${id} duplicated as ${savedCampaign.id} with ${originalContacts.length} contacts`);

        return savedCampaign;
    }

    // Templates
    async findAllTemplates(tenantId: string) {
        return this.templateRepo.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    async createTemplate(tenantId: string, data: Partial<Template>) {
        const template = this.templateRepo.create({ ...data, tenantId });
        return this.templateRepo.save(template);
    }


    async findCampaignContacts(
        campaignId: string,
        tenantId: string,
        query: PaginationQueryDto & { status?: string }
    ) {
        await this.findOne(campaignId, tenantId); // Verify ownership

        const page = Number(query?.page) || 1;
        const limit = Number(query?.limit) || 20;
        const skip = (page - 1) * limit;

        const qb = this.campaignContactRepo.createQueryBuilder('cc')
            .leftJoinAndSelect('cc.contact', 'contact')
            .where('cc.campaign_id = :campaignId', { campaignId });

        if (query.status) {
            qb.andWhere('cc.status = :status', { status: query.status });
        }

        qb.orderBy('cc.updatedAt', 'DESC') // Most recent updates first (failures usually happen last)
            .addOrderBy('cc.createdAt', 'ASC')
            .take(limit)
            .skip(skip);

        const [data, total] = await qb.getManyAndCount();

        return {
            data,
            meta: {
                total,
                page,
                last_page: Math.ceil(total / limit),
                limit,
            },
        };
    }

    // Contacts
    async findAllContacts(tenantId: string, query?: PaginationQueryDto) {
        return this.contactsService.findAllContacts(tenantId, query as any);
    }

    async createContact(tenantId: string, data: Partial<Contact>) {
        return this.contactsService.createContact(tenantId, data as any);
    }

    async importContacts(tenantId: string, contacts: Array<{ phone: string; name?: string; email?: string; tags?: string[] }>) {
        const createContactDtos = contacts.map(c => ({
            phone: c.phone,
            name: c.name,
            email: c.email,
            tagIds: [] as string[],
            customFields: { email: c.email, tags: c.tags }
        }));

        const result = await this.contactsService.importContacts(tenantId, createContactDtos);

        // Controller expects an array to check .length
        return new Array(result.imported).fill({});
    }

    async getGlobalContactStats(tenantId: string) {
        return this.contactsService.getContactStats(tenantId);
    }

    async retryFailed(id: string, tenantId: string) {
        const campaign = await this.findOne(id, tenantId);

        // 1. Resetar contatos com falha
        const result = await this.campaignContactRepo.update(
            { campaignId: id, status: 'failed' },
            {
                status: 'queued',
                errorMessage: null as any,
                failedAt: null as any,
                retryCount: 0,
            }
        );

        if (result.affected === 0) {
            return { message: 'No failed contacts to retry', count: 0 };
        }

        this.logger.log(`🌀 Resetting ${result.affected} failed contacts for campaign ${id}`);

        // 2. Atualizar status da campanha se necessário
        // Decrementar contagem de falhas (aproximado)
        await this.campaignRepo.decrement({ id }, 'failedCount', result.affected || 0);

        // Se estava completed ou paused, volta para running
        if (campaign.status === 'completed' || campaign.status === 'paused') {
            await this.campaignRepo.update(id, {
                status: 'running',
                completedAt: null as any,
            });
        }

        // 3. Enfileirar novamente
        const queued = await this.dispatcherService.enqueueCampaign(id, tenantId);

        return {
            message: `Retrying ${queued} contacts`,
            count: queued,
            affected: result.affected,
        };
    }


    /**
     * Calcula previsão de término de uma campanha baseado na saúde dos chips e configuração de disparo
     */
    async getEstimate(id: string, tenantId: string) {
        const campaign = await this.findOne(id, tenantId);

        // Contatos restantes
        const remainingContacts = await this.campaignContactRepo.count({
            where: { campaignId: id, status: 'queued' },
        });

        const sentContacts = campaign.sentCount || 0;
        const failedContacts = campaign.failedCount || 0;
        const totalContacts = campaign.totalContacts || 0;

        if (remainingContacts === 0) {
            return {
                campaignId: id,
                campaignName: campaign.name,
                status: campaign.status,
                remainingContacts: 0,
                totalContacts,
                sentContacts,
                failedContacts,
                estimatedFinishAt: campaign.completedAt || new Date().toISOString(),
                estimatedDurationMs: 0,
                estimatedDurationFormatted: 'Concluída',
                spansMultipleDays: false,
                instanceDetails: [],
                avgDelayPerMessageMs: 0,
                avgDelayFormatted: '0s',
            };
        }

        // Buscar instâncias da campanha
        const instanceIds = campaign.instanceIds?.length > 0
            ? campaign.instanceIds
            : (campaign.instanceId ? [campaign.instanceId] : []);

        const instanceDetails: Array<{
            id: string;
            name: string;
            status: string;
            warmupDay: number;
            dailySent: number;
            dailyLimit: number;
            remainingToday: number;
            healthScore: number;
            healthLabel: string;
            warmupMultiplier: number;
            effectiveDelayRange: string;
        }> = [];

        let totalRemainingToday = 0;
        let connectedCount = 0;
        let avgWarmupMultiplier = 0;

        for (const instId of instanceIds) {
            const inst = await this.campaignRepo.manager.getRepository(Instance).findOne({
                where: { id: instId },
            });

            if (!inst) continue;

            const warmupDay = inst.warmupDay || 0;
            const warmupMultiplier = this.calculateWarmupMultiplier(warmupDay);
            const remainingToday = Math.max(0, inst.dailyLimit - inst.dailySent);
            const healthScore = this.calculateHealthScore(inst);
            const isConnected = String(inst.status) === 'connected';

            if (isConnected) {
                connectedCount++;
                totalRemainingToday += remainingToday;
                avgWarmupMultiplier += warmupMultiplier;
            }

            // Calcular delay efetivo para esta instância
            const baseMinSec = (campaign.minDelayMs || 5000) / 1000;
            const baseMaxSec = (campaign.maxDelayMs || 15000) / 1000;
            const effectiveMinSec = Math.round(baseMinSec * warmupMultiplier);
            const effectiveMaxSec = Math.round(baseMaxSec * warmupMultiplier);

            instanceDetails.push({
                id: inst.id,
                name: inst.instanceName,
                status: String(inst.status),
                warmupDay,
                dailySent: inst.dailySent,
                dailyLimit: inst.dailyLimit,
                remainingToday,
                healthScore,
                healthLabel: healthScore >= 80 ? 'Excelente' : healthScore >= 60 ? 'Bom' : healthScore >= 40 ? 'Regular' : 'Ruim',
                warmupMultiplier: Math.round(warmupMultiplier * 100) / 100,
                effectiveDelayRange: `${effectiveMinSec}s - ${effectiveMaxSec}s`,
            });
        }

        if (connectedCount > 0) {
            avgWarmupMultiplier /= connectedCount;
        } else {
            avgWarmupMultiplier = 1;
        }

        // Calcular delay médio por mensagem
        const baseMinMs = campaign.minDelayMs || 5000;
        const baseMaxMs = campaign.maxDelayMs || 15000;
        const avgBaseDelayMs = (baseMinMs + baseMaxMs) / 2;
        const avgDelayPerMessageMs = Math.round(avgBaseDelayMs * avgWarmupMultiplier);

        // Typing simulation adds ~2-15s extra (avg ~8.5s)
        const avgTypingMs = 8500;
        // Pre-typing delay 0.5-2s (avg 1.25s)
        const avgPreTypingMs = 1250;
        const totalAvgDelayPerMsg = avgDelayPerMessageMs + avgTypingMs + avgPreTypingMs;

        // Se flow campaign, delay é mais simples (sem typing simulation do dispatcher)
        const effectiveDelayPerMsg = campaign.flowId ? avgDelayPerMessageMs : totalAvgDelayPerMsg;

        // Calcular horas ativas por dia
        const activeStart = campaign.settings?.activeHoursStart || '08:00';
        const activeEnd = campaign.settings?.activeHoursEnd || '20:00';
        const [startH, startM] = activeStart.split(':').map(Number);
        const [endH, endM] = activeEnd.split(':').map(Number);
        const activeMinutesPerDay = (endH * 60 + endM) - (startH * 60 + startM);
        const activeMsPerDay = Math.max(activeMinutesPerDay * 60 * 1000, 8 * 3600 * 1000); // min 8h

        // Throughput: se temos N instâncias conectadas, a concurrency é limitada pelo
        // concurrency do BullMQ (5) mas cada job tem delays longos, então efetivamente
        // é ~1 mensagem por (effectiveDelay / min(connectedInstances, 5))
        const effectiveConcurrency = Math.min(connectedCount || 1, 5);
        const effectiveDelayBetweenSends = effectiveDelayPerMsg / effectiveConcurrency;

        // Calcular tempo total estimado
        const totalEstimatedMs = remainingContacts * effectiveDelayBetweenSends;

        // Verificar se excede horas ativas de hoje
        const now = new Date();
        const todayEndActive = new Date(now);
        todayEndActive.setHours(endH, endM, 0, 0);
        const msRemainingToday = Math.max(0, todayEndActive.getTime() - now.getTime());

        // Verificar limite diário
        const messagesCanSendToday = connectedCount > 0
            ? Math.min(totalRemainingToday, Math.floor(msRemainingToday / effectiveDelayBetweenSends))
            : 0;

        const spansMultipleDays = remainingContacts > messagesCanSendToday;

        // Calcular data estimada de término
        let estimatedFinishAt: Date;
        if (!spansMultipleDays) {
            estimatedFinishAt = new Date(now.getTime() + totalEstimatedMs);
        } else {
            // Hoje envia messagesCanSendToday, o restante preenche os próximos dias
            const remainingAfterToday = remainingContacts - messagesCanSendToday;
            const messagesPerDay = connectedCount > 0
                ? Math.min(totalRemainingToday || Infinity, Math.floor(activeMsPerDay / effectiveDelayBetweenSends))
                : 1; // Avoid division by zero
            const additionalDays = Math.ceil(remainingAfterToday / Math.max(messagesPerDay, 1));

            estimatedFinishAt = new Date(now);
            estimatedFinishAt.setDate(estimatedFinishAt.getDate() + additionalDays);
            estimatedFinishAt.setHours(startH + Math.floor((remainingAfterToday % messagesPerDay) * effectiveDelayBetweenSends / 3600000), startM, 0, 0);
        }

        // Formatar duração
        const formatDuration = (ms: number): string => {
            if (ms < 60000) return `${Math.round(ms / 1000)}s`;
            if (ms < 3600000) return `${Math.round(ms / 60000)}min`;
            const hours = Math.floor(ms / 3600000);
            const minutes = Math.round((ms % 3600000) / 60000);
            if (hours < 24) return `${hours}h ${minutes}min`;
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h`;
        };

        return {
            campaignId: id,
            campaignName: campaign.name,
            status: campaign.status,
            remainingContacts,
            totalContacts,
            sentContacts,
            failedContacts,
            connectedInstances: connectedCount,
            totalInstances: instanceIds.length,
            estimatedFinishAt: estimatedFinishAt.toISOString(),
            estimatedDurationMs: Math.round(totalEstimatedMs),
            estimatedDurationFormatted: formatDuration(totalEstimatedMs),
            spansMultipleDays,
            messagesCanSendToday,
            activeHours: `${activeStart} - ${activeEnd}`,
            avgDelayPerMessageMs: Math.round(effectiveDelayPerMsg),
            avgDelayFormatted: formatDuration(effectiveDelayPerMsg),
            effectiveConcurrency,
            instanceDetails,
        };
    }

    private calculateWarmupMultiplier(warmupDay: number): number {
        if (warmupDay <= 3) return 4 - (warmupDay - 1) * 0.5; // 4x, 3.5x, 3x
        if (warmupDay <= 7) return 3 - (warmupDay - 3) * 0.25; // 2.75x, 2.5x, 2.25x, 2x
        if (warmupDay <= 14) return 2 - (warmupDay - 7) * 0.14; // ~1.86x ... ~1x
        return 1;
    }

    private calculateHealthScore(instance: Instance): number {
        let score = 50;
        const warmupDays = instance.warmupDay || 0;
        if (warmupDays >= 14) score += 25;
        else if (warmupDays >= 7) score += 15;
        else if (warmupDays >= 3) score += 5;

        const usageRatio = (instance.dailySent || 0) / (instance.dailyLimit || 100);
        if (usageRatio < 0.3) score += 15;
        else if (usageRatio < 0.6) score += 10;
        else if (usageRatio < 0.8) score += 5;
        else score -= 10;

        if (String(instance.status) === 'connected') score += 10;
        return Math.max(0, Math.min(100, score));
    }
}
