import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

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

    async testProxy(data: {
        host: string;
        port: number;
        type: string;
        username?: string;
        password?: string;
    }) {
        const startTime = Date.now();
        const auth = data.username ? `${data.username}:${data.password}@` : '';
        const proxyUrl = `${data.type}://${auth}${data.host}:${data.port}`;
        
        try {
            this.logger.log(`[PROXY TEST] Inciando teste para: ${data.type}://${data.host}:${data.port}`);
            let agent: any;
            
            if (data.type.includes('socks')) {
                agent = new SocksProxyAgent(proxyUrl);
            } else {
                agent = new HttpsProxyAgent(proxyUrl);
            }

            // Tentamos bater na API de IP do Google/Ipify pra validar se o proxy navega externamente
            const response = await axios.get('https://api.ipify.org?format=json', {
                httpsAgent: agent,
                httpAgent: agent,
                timeout: 8000 // 8s limite de paciencia
            });

            const latency = Date.now() - startTime;
            this.logger.log(`[PROXY TEST] ✅ Sucesso! IP retornado: ${response.data?.ip} | Latência: ${latency}ms`);
            
            return {
                online: true,
                latencyMs: latency,
                ip: response.data?.ip
            };
        } catch (error: any) {
            const latency = Date.now() - startTime;
            this.logger.warn(`[PROXY TEST] ❌ Falha no teste: ${error.message}`);
            return {
                online: false,
                latencyMs: latency,
                error: error.message || 'Tempo limite excedido ou proxy recusou a conexão.'
            };
        }
    }
}
