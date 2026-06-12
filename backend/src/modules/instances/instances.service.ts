import { Injectable, NotFoundException, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

import { Instance } from './entities/instance.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { WhatsAppProviderFactory, ProviderType } from '../whatsapp';
import { InstanceStatus } from '../../common/enums/instance-status.enum';
import { ProxiesService } from '../proxies/proxies.service';

@Injectable()
export class InstancesService {
    private readonly logger = new Logger(InstancesService.name);

    constructor(
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
        @InjectRepository(Tenant)
        private tenantRepo: Repository<Tenant>,
        private providerFactory: WhatsAppProviderFactory,
        private proxiesService: ProxiesService,
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
        warmupProfile?: string;
        warmupDay?: number;
    }) {
        // 1. Obter o Tenant e seu plano
        const tenant = await this.tenantRepo.findOne({
            where: { id: tenantId },
            relations: ['plan'],
        });

        if (!tenant) {
            throw new NotFoundException('Tenant não encontrado');
        }

        // 2. Contar chips atuais do tenant
        const currentCount = await this.instanceRepo.count({
            where: { tenantId }
        });

        // 3. Verificar limite de instâncias do plano
        const maxInstances = tenant.plan?.maxInstances || 1;
        if (currentCount >= maxInstances) {
            throw new BadRequestException(
                `Limite de chips atingido para o plano ${tenant.plan?.name || 'contratado'} (${currentCount}/${maxInstances}). Por favor, faça um upgrade no seu plano nas configurações financeiras.`
            );
        }

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
            let allocatedProxyId = data.proxyId;

            // Se for canal não oficial e não tiver proxy especificado, alocar automaticamente!
            if (!isOfficial && !allocatedProxyId) {
                this.logger.log(`[PROXY AUTO-ALLOC] Buscando proxy livre no pool para o tenant ${tenantId}`);
                
                // 1. Tentar encontrar um proxy já existente e não associado a nenhuma instância
                const unassignedProxy = await this.proxiesService.getUnassignedProxy(tenantId);

                if (unassignedProxy) {
                    this.logger.log(`[PROXY AUTO-ALLOC] Reutilizando proxy livre existente: ${unassignedProxy.host}:${unassignedProxy.port}`);
                    allocatedProxyId = unassignedProxy.id;
                } else {
                    this.logger.log(`[PROXY AUTO-ALLOC] Nenhum proxy livre encontrado. Provisionando um novo proxy ISP da IPRoyal...`);
                    // 2. Chamar o serviço para comprar/criar um novo proxy
                    const newProxy = await this.proxiesService.buyProxyFromProvider(tenantId);
                    allocatedProxyId = newProxy.id;
                }
            }

            // Save to database
            const instance = this.instanceRepo.create({
                tenantId,
                instanceName: data.instanceName,
                proxyId: allocatedProxyId,
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
                warmupProfile: data.warmupProfile,
                warmupDay: data.warmupDay,
            });

            await this.instanceRepo.save(instance);

            // Sincronizar o assignedInstanceId no proxy para a exibição no painel
            if (allocatedProxyId) {
                await this.proxiesService.assignProxy(tenantId, allocatedProxyId, instance.id);
            }

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
        try {
            return await provider.getQrCode(instance.instanceName);
        } catch (error: any) {
            // Auto-healing: if the instance does not exist in the provider container, recreate it
            if (
                error.message?.includes('404') || 
                error.message?.includes('not found') || 
                error.message?.includes('400') || 
                error.message?.includes('500')
            ) {
                this.logger.warn(`Instance '${instance.instanceName}' missing or errored in provider container. Re-creating...`);
                const config = instance.channelType === 'official' ? instance.metaConfig : {};
                try {
                    await provider.createInstance(instance.instanceName, config);
                } catch (createErr) {
                    this.logger.error(`Auto-healing creation failed for ${instance.instanceName}: ${createErr.message}`);
                }
                // Try fetching the QR code again after creation
                return await provider.getQrCode(instance.instanceName);
            }
            throw error;
        }
    }

    async getPairingCode(id: string, tenantId: string, phoneNumber: string): Promise<{ pairingCode: string; phone: string }> {
        const instance = await this.findOne(id, tenantId);
        const provider = this.providerFactory.getProvider((instance.provider as ProviderType) || 'evolution');

        if (provider.providerType !== 'evolution') {
            throw new ConflictException('Pairing code connection is only supported by Evolution API provider');
        }

        const adapter = provider as any;
        if (typeof adapter.getPairingCode !== 'function') {
            throw new ConflictException('Pairing code connection is not supported by the active provider version');
        }

        const formattedPhone = phoneNumber.replace(/\D/g, '');

        // 🔥 CRITICAL: Force a clean reset of the instance session in the container.
        // If the instance has standard QR code generation already active (due to modal opening),
        // Baileys locks in QR mode and connect?number=... always returns pairingCode: null.
        // We delete and recreate it fresh to go directly into pairing code mode.
        this.logger.log(`Forcing clean reset of instance '${instance.instanceName}' in container to prepare for pairing code...`);
        try {
            await provider.deleteInstance(instance.instanceName);
            // Introduce a brief sleep to allow Evolution API to finish asynchronous deletion
            await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (deleteErr: any) {
            this.logger.warn(`Failed to delete instance '${instance.instanceName}' before pairing (normal if not present): ${deleteErr.message}`);
        }

        const config = instance.channelType === 'official' ? instance.metaConfig : {};
        try {
            await provider.createInstance(instance.instanceName, config);
            // Introduce a brief sleep to allow Baileys to initialize inside the Evolution container cleanly
            await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (createErr: any) {
            this.logger.error(`Recreation failed for '${instance.instanceName}' during pairing setup: ${createErr.message}`);
        }

        try {
            const result = await adapter.getPairingCode(instance.instanceName, formattedPhone);
            
            // Save the phone number that actually worked to ensure it is recorded correctly
            instance.phone = result.phone;
            await this.instanceRepo.save(instance);
            
            return result;
        } catch (error: any) {
            throw error;
        }
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
            
            // 🚀 GATILHO AUTOMÁTICO: Se acabou de conectar e o chip ainda tem maturidade 0, disparar o Scan de Raio-X
            if (status.status === InstanceStatus.CONNECTED && (!instance.warmupDay || instance.warmupDay === 0)) {
                this.logger.log(`Auto-scanning maturity for veteran chip ${instance.instanceName}`);
                // Não bloqueamos a requisição HTTP para isso, rodamos em background
                this.scanMaturity(id, tenantId).catch(e => this.logger.warn(`Auto-scan failed: ${e.message}`));
            }
        }

        return {
            instance,
            providerStatus: status,
        };
    }

    /**
     * Scan Chip for Historical Conversations to accurately estimate maturity
     */
    async scanMaturity(id: string, tenantId: string) {
        const instance = await this.findOne(id, tenantId);
        
        if (instance.status !== InstanceStatus.CONNECTED) {
            throw new ConflictException('Chip must be connected to scan maturity');
        }

        const provider = this.providerFactory.getProvider((instance.provider as ProviderType) || 'evolution');
        
        this.logger.log(`[SCAN] Starting maturity scan for ${instance.instanceName}...`);
        
        try {
            const metrics = await provider.getMaturityMetrics(instance.instanceName);
            const chatCount = metrics.chatCount || 0;
            const groupCount = metrics.groupCount || 0;

            let calculatedDay = 0;

            // 🧪 HEURÍSTICA DE MATURIDADE WHATSAAS:
            if (chatCount > 150) calculatedDay = 21;      // Veterano Absoluto
            else if (chatCount > 80) calculatedDay = 18; // Veterano Avançado
            else if (chatCount > 40) calculatedDay = 14; // Maduro (Warmup Completo)
            else if (chatCount > 20) calculatedDay = 10; // Médio
            else if (chatCount > 10) calculatedDay = 7;  // Ativo básico
            else if (chatCount > 3) calculatedDay = 3;   // Em uso

            // Bônus de Grupo (Grupos dão + confianca no algoritmo Meta)
            if (groupCount > 10 && calculatedDay < 21) calculatedDay = Math.min(21, calculatedDay + 5);
            else if (groupCount > 3 && calculatedDay < 18) calculatedDay += 3;

            // Somente aplicamos se a maturidade real for MAIOR que a salva no BD
            const currentDay = instance.warmupDay || 0;
            
            if (calculatedDay > currentDay) {
                this.logger.log(`[SCAN] Chip ${instance.instanceName} promoted from Day ${currentDay} to Day ${calculatedDay} based on ${chatCount} chats!`);
                
                instance.warmupDay = calculatedDay;
                // Opcionalmente forçar dailyLimit alto já de cara pra veteranos
                if (calculatedDay >= 14 && (!instance.dailyLimit || instance.dailyLimit < 150)) {
                    instance.dailyLimit = 150; 
                }
                
                await this.instanceRepo.save(instance);
            }

            return {
                success: true,
                metrics: { chatCount, groupCount },
                previousWarmupDay: currentDay,
                newWarmupDay: instance.warmupDay,
                promotion: calculatedDay > currentDay
            };

        } catch (error: any) {
            this.logger.error(`Failed maturity scan: ${error.message}`);
            throw error;
        }
    }

    async update(id: string, tenantId: string, data: Partial<Instance>) {
        const instance = await this.findOne(id, tenantId);
        
        // Manter integridade de metadados anteriores e mesclar novos configurações
        if (data.metaConfig) {
            const currentMeta = instance.metaConfig || {};
            data.metaConfig = {
                ...currentMeta,
                ...data.metaConfig
            };
        }

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

        // Se tinha proxy alocado, limpar o assignedInstanceId do proxy antes de remover a instância
        if (instance.proxyId) {
            try {
                await this.proxiesService.assignProxy(tenantId, instance.proxyId, null);
            } catch (e) {
                this.logger.warn(`Failed to unassign proxy: ${e.message}`);
            }
        }

        await this.instanceRepo.remove(instance);
        return { success: true };
    }


    // Get available providers
    getAvailableProviders() {
        return this.providerFactory.getAvailableProviders();
    }


}
