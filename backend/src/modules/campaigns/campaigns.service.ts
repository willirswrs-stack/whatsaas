import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

import {
    Campaign,
    CampaignContact,
    MessageVariation,
    Contact,
    Template,
} from './entities/campaign.entity';
import { AiService } from '../ai/ai.service';
import { DispatcherService } from '../dispatcher/dispatcher.service';
import { SettingsService } from '../settings/settings.service';

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
        private aiService: AiService,
        private dispatcherService: DispatcherService,
        @Inject(forwardRef(() => SettingsService))
        private settingsService: SettingsService,
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
        minDelaySec?: number;
        maxDelaySec?: number;
    }) {
        const { contactIds, minDelaySec, maxDelaySec, ...campaignData } = data;

        const campaign = this.campaignRepo.create({
            ...campaignData,
            tenantId,
            status: 'draft',
            totalContacts: contactIds?.length || 0,
            minDelayMs: (minDelaySec || 5) * 1000,
            maxDelayMs: (maxDelaySec || 15) * 1000,
        });

        const savedCampaign = await this.campaignRepo.save(campaign);

        // Vincular contatos à campanha
        if (contactIds && contactIds.length > 0) {
            const campaignContacts = contactIds.map(contactId =>
                this.campaignContactRepo.create({
                    campaignId: savedCampaign.id,
                    contactId,
                    status: 'queued',
                })
            );
            await this.campaignContactRepo.save(campaignContacts);
        }

        return savedCampaign;
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

        qb.orderBy('cc.updated_at', 'DESC') // Most recent updates first (failures usually happen last)
            .addOrderBy('cc.created_at', 'ASC')
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
        const page = Number(query?.page) || 1;
        const limit = Number(query?.limit) || 10;
        const skip = (page - 1) * limit;


        const [data, total] = await this.contactRepo.findAndCount({
            where: { tenantId },
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

    async createContact(tenantId: string, data: Partial<Contact>) {
        const contact = this.contactRepo.create({ ...data, tenantId });
        return this.contactRepo.save(contact);
    }

    async importContacts(tenantId: string, contacts: Array<{ phone: string; name?: string; email?: string; tags?: string[] }>) {
        const entities = contacts.map((c) =>
            this.contactRepo.create({
                phone: c.phone,
                name: c.name,
                tenantId,
                onWhatsapp: true,
                isValid: true,
                customFields: { email: c.email, tags: c.tags },
            }),
        );
        return this.contactRepo.save(entities);
    }
}
