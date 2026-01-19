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
            // Create in WhatsApp provider
            const providerResult = await provider.createInstance(data.instanceName);

            // Save to database
            const instance = this.instanceRepo.create({
                tenantId,
                instanceName: data.instanceName,
                proxyId: data.proxyId,
                provider: providerType,
                status: InstanceStatus.CONNECTING,
                evolutionConfig: {
                    instanceId: providerResult.instanceId,
                },
            });

            await this.instanceRepo.save(instance);

            // Get QR code
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

        // Update instance status in DB
        if (status.status === InstanceStatus.CONNECTED && instance.status !== InstanceStatus.CONNECTED) {
            instance.status = InstanceStatus.CONNECTED;
            instance.phone = status.phoneNumber || instance.phone;
            instance.connectedAt = new Date();
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
