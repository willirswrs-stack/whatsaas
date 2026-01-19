import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Campaign, CampaignContact, Contact } from '../campaigns/entities/campaign.entity';
import { DISPATCH_QUEUE } from '../../config/bull.config';
import { DispatchJobData } from './dispatcher.processor';

@Injectable()
export class DispatcherService {
    private readonly logger = new Logger(DispatcherService.name);

    constructor(
        @InjectQueue(DISPATCH_QUEUE)
        private dispatchQueue: Queue,
        @InjectRepository(Campaign)
        private campaignRepo: Repository<Campaign>,
        @InjectRepository(CampaignContact)
        private campaignContactRepo: Repository<CampaignContact>,
        @InjectRepository(Contact)
        private contactRepo: Repository<Contact>,
    ) { }

    /**
     * Enfileira todos os contatos de uma campanha para envio
     */
    async enqueueCampaign(campaignId: string, tenantId: string): Promise<number> {
        // Validar ownership
        const campaign = await this.campaignRepo.findOne({
            where: { id: campaignId, tenantId },
        });

        if (!campaign) {
            throw new ForbiddenException(`Campaign ${campaignId} not found or access denied`);
        }

        // Buscar contatos pendentes
        const pendingContacts = await this.campaignContactRepo.find({
            where: {
                campaignId,
                status: 'queued',
            },
        });

        if (pendingContacts.length === 0) {
            this.logger.warn(`No pending contacts for campaign ${campaignId}`);
            return 0;
        }

        // Enfileirar cada contato
        const jobs = pendingContacts.map((cc) => ({
            name: `dispatch-${cc.id}`,
            data: {
                tenantId,
                campaignContactId: cc.id,
                campaignId,
            } as DispatchJobData,
            opts: {
                jobId: cc.id,
                priority: 0,
            },
        }));

        await this.dispatchQueue.addBulk(jobs);

        // Atualizar campanha
        await this.campaignRepo.update(campaignId, {
            status: 'running',
            startedAt: new Date(),
        });

        this.logger.log(
            `Enqueued ${jobs.length} messages for campaign ${campaignId}`,
        );

        return jobs.length;
    }

    /**
     * Prepara contatos para uma campanha
     */
    async prepareCampaignContacts(
        campaignId: string,
        tenantId: string,
        contactIds?: string[],
        segmentIds?: string[],
    ): Promise<number> {
        let contacts: Contact[] = [];

        if (contactIds && contactIds.length > 0) {
            // Usar lista específica de contatos
            contacts = await this.contactRepo.findByIds(contactIds);
        } else {
            // Buscar todos os contatos do tenant (ou por segmento)
            contacts = await this.contactRepo.find({
                where: { tenantId, isValid: true },
            });
        }

        // Criar registros de campanha-contatos
        const campaignContacts = contacts.map((contact) => ({
            campaignId,
            contactId: contact.id,
            status: 'queued',
        }));

        await this.campaignContactRepo.insert(campaignContacts);

        // Atualizar total da campanha
        await this.campaignRepo.update(campaignId, {
            totalContacts: contacts.length,
        });

        return contacts.length;
    }

    /**
     * Pausa uma campanha em execução
     */
    async pauseCampaign(campaignId: string): Promise<void> {
        await this.campaignRepo.update(campaignId, {
            status: 'paused',
        });

        // Remove jobs pendentes da fila
        // (jobs já em processamento continuarão)
        const jobs = await this.dispatchQueue.getJobs(['waiting', 'delayed']);
        const campaignJobs = jobs.filter(
            (j) => j.data.campaignId === campaignId,
        );

        for (const job of campaignJobs) {
            await job.remove();
        }

        this.logger.log(`Campaign ${campaignId} paused, ${campaignJobs.length} jobs removed`);
    }

    /**
     * Retoma uma campanha pausada
     */
    async resumeCampaign(campaignId: string, tenantId: string): Promise<number> {
        await this.campaignRepo.update(campaignId, {
            status: 'running',
        });

        return this.enqueueCampaign(campaignId, tenantId);
    }

    /**
     * Obtém estatísticas da campanha
     */
    async getCampaignStats(campaignId: string) {
        const stats = await this.campaignContactRepo
            .createQueryBuilder('cc')
            .select('cc.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('cc.campaignId = :campaignId', { campaignId })
            .groupBy('cc.status')
            .getRawMany();

        const result: Record<string, number> = {
            queued: 0,
            sending: 0,
            sent: 0,
            delivered: 0,
            read: 0,
            failed: 0,
        };

        for (const stat of stats) {
            result[stat.status] = parseInt(stat.count);
        }

        return result;
    }
}
