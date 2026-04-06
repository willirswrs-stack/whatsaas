import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Instance, Proxy } from './entities/instance.entity';
import { WhatsAppProviderFactory, ProviderType } from '../whatsapp';
import { InstanceStatus } from '../../common/enums/instance-status.enum';

@Injectable()
export class InstancesService {
    private readonly logger = new Logger(InstancesService.name);

    constructor(
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        @InjectRepository(Proxy)
        private proxyRepo: Repository<Proxy>,
        private providerFactory: WhatsAppProviderFactory,
    ) { }

    async findAll(tenantId: string) {
        try {
            return await this.instanceRepo.find({
                where: { tenantId },
                relations: ['proxy'],
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            this.logger.error(`Failed to find instances: ${error.message}`, error.stack);
            throw error;
        }
    }

    async findConnected(tenantId: string) {
        return this.instanceRepo.findOne({
            where: { tenantId, status: InstanceStatus.CONNECTED }
        });
    }

    async findById(id: string) {
        return this.instanceRepo.findOne({
            where: { id },
            relations: ['proxy'],
        });
    }

    async findOne(id: string, tenantId: string) {
        const instance = await this.instanceRepo.findOne({
            where: { id, tenantId },
            relations: ['proxy', 'warmupSchedules'],
        });

        if (!instance) {
            throw new NotFoundException('Instance not found');
        }

        return instance;
    }

    async create(tenantId: string, data: {
        instanceName: string;
        proxyId?: string;
        provider?: ProviderType;
        config?: any;
    }) {
        // Verificar se já existe uma instância com este nome
        const existing = await this.instanceRepo.findOne({
            where: { instanceName: data.instanceName }
        });

        if (existing) {
            throw new ConflictException(`Já existe uma instância com o nome "${data.instanceName}". Por favor, escolha outro nome ou exclua a existente.`);
        }

        const providerType = data.provider || 'evolution';
        const provider = this.providerFactory.getProvider(providerType);

        this.logger.log(`Creating instance via ${providerType}: ${data.instanceName}`);

        try {
            // Create in WhatsApp provider, passing config (e.g. for official API token/number)
            const providerResult = await provider.createInstance(data.instanceName, data.config);

            const isOfficial = !!data.config?.token || !!data.config?.accessToken;

            // Save to database
            const instance = this.instanceRepo.create({
                tenantId,
                instanceName: data.instanceName,
                proxyId: data.proxyId,
                provider: providerType,
                status: isOfficial ? InstanceStatus.CONNECTING : InstanceStatus.CREATED,
                channelType: isOfficial ? 'official' : 'unofficial',
                metaConfig: isOfficial ? {
                    wabaId: data.config.wabaId,
                    phoneNumberId: data.config.phoneNumberId,
                    appId: data.config.appId,
                    // Note: Sensitive tokens might usually be encrypted or stored securely.
                    // Storing plain text for POC/Dev, but consider security implications.
                    accessToken: data.config.accessToken || data.config.token,
                } : {},
                evolutionConfig: {
                    instanceId: providerResult.instanceId,
                    integration: isOfficial ? 'WHATSAPP-BUSINESS' : 'WHATSAPP-BAILEYS',
                },
            });

            await this.instanceRepo.save(instance);

            // Get QR code (only if not official, but getQrCode handles logic)
            // If official, getQrCode might return empty or null
            const qrCode = await provider.getQrCode(data.instanceName);

            return { instance, qrCode };
        } catch (error) {
            this.logger.error(`Failed to create instance: ${error.message}`);

            // Verificar se é erro de duplicata do banco
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                throw new ConflictException(`Já existe uma instância com o nome "${data.instanceName}". Por favor, escolha outro nome.`);
            }

            throw error;
        }
    }

    async getQrCode(id: string, tenantId: string) {
        const instance = await this.findOne(id, tenantId);
        const provider = this.providerFactory.getProvider((instance.provider as ProviderType) || 'evolution');
        return provider.getQrCode(instance.instanceName);
    }

    async getStatus(id: string, tenantId: string) {
        const instance = await this.findOne(id, tenantId);
        const provider = this.providerFactory.getProvider((instance.provider as ProviderType) || 'evolution');
        const status = await provider.getStatus(instance.instanceName);

        let shouldSave = false;

        // Update instance status in DB
        if (status.status === InstanceStatus.CONNECTED && instance.status !== InstanceStatus.CONNECTED) {
            instance.status = InstanceStatus.CONNECTED;
            instance.connectedAt = new Date();
            shouldSave = true;
        }

        // Se o provedor retornar telefone e não tivermos, ou se o status for conectado agora
        if (status.status === InstanceStatus.CONNECTED && status.phoneNumber && !instance.phone) {
            instance.phone = status.phoneNumber.replace('@s.whatsapp.net', '');
            shouldSave = true;
        }

        if (shouldSave) {
            await this.instanceRepo.save(instance);
        }

        return {
            instance,
            providerStatus: status,
        };
    }

    async update(id: string, tenantId: string, data: Partial<Instance>) {
        const instance = await this.findOne(id, tenantId);
        Object.assign(instance, data);
        return this.instanceRepo.save(instance);
    }

    async updateProxy(id: string, tenantId: string, proxyId: string) {
        const instance = await this.findOne(id, tenantId);
        instance.proxyId = proxyId;
        return this.instanceRepo.save(instance);
    }

    async delete(id: string, tenantId: string) {
        const instance = await this.findOne(id, tenantId);
        const provider = this.providerFactory.getProvider((instance.provider as ProviderType) || 'evolution');

        try {
            await provider.deleteInstance(instance.instanceName);
        } catch (e) {
            this.logger.warn(`Failed to delete from provider: ${e.message}`);
            // Continue with DB deletion
        }

        await this.instanceRepo.remove(instance);
        return { success: true };
    }


    // Get available providers
    getAvailableProviders() {
        return this.providerFactory.getAvailableProviders();
    }

    // Proxies
    async findAllProxies(tenantId: string) {
        return this.proxyRepo.find({
            where: { tenantId },
            order: { createdAt: 'DESC' },
        });
    }

    async createProxy(tenantId: string, data: Partial<Proxy>) {
        const proxy = this.proxyRepo.create({ ...data, tenantId });
        return this.proxyRepo.save(proxy);
    }

    async deleteProxy(id: string, tenantId: string) {
        const proxy = await this.proxyRepo.findOne({ where: { id, tenantId } });
        if (!proxy) throw new NotFoundException('Proxy not found');
        await this.proxyRepo.remove(proxy);
        return { success: true };
    }
}
