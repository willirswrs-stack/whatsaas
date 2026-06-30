"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InstancesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstancesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const instance_entity_1 = require("./entities/instance.entity");
const chip_detail_entity_1 = require("./entities/chip-detail.entity");
const tenant_entity_1 = require("../tenants/entities/tenant.entity");
const whatsapp_1 = require("../whatsapp");
const instance_status_enum_1 = require("../../common/enums/instance-status.enum");
const proxies_service_1 = require("../proxies/proxies.service");
let InstancesService = InstancesService_1 = class InstancesService {
    instanceRepo;
    tenantRepo;
    providerFactory;
    proxiesService;
    logger = new common_1.Logger(InstancesService_1.name);
    constructor(instanceRepo, tenantRepo, providerFactory, proxiesService) {
        this.instanceRepo = instanceRepo;
        this.tenantRepo = tenantRepo;
        this.providerFactory = providerFactory;
        this.proxiesService = proxiesService;
    }
    async findAll(tenantId) {
        try {
            return await this.instanceRepo.find({
                where: { tenantId },
                relations: ['proxy'],
                order: { createdAt: 'DESC' },
            });
        }
        catch (error) {
            this.logger.error(`Failed to find instances: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findConnected(tenantId) {
        return this.instanceRepo.findOne({
            where: { tenantId, status: instance_status_enum_1.InstanceStatus.CONNECTED }
        });
    }
    async findById(id) {
        return this.instanceRepo.findOne({
            where: { id },
            relations: ['proxy'],
        });
    }
    async findOne(id, tenantId) {
        const instance = await this.instanceRepo.findOne({
            where: { id, tenantId },
            relations: ['proxy', 'warmupSchedules'],
        });
        if (!instance) {
            throw new common_1.NotFoundException('Instance not found');
        }
        return instance;
    }
    async create(tenantId, data) {
        // 1. Obter o Tenant e seu plano
        const tenant = await this.tenantRepo.findOne({
            where: { id: tenantId },
            relations: ['plan'],
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant não encontrado');
        }
        // 2. Contar chips atuais do tenant
        const currentCount = await this.instanceRepo.count({
            where: { tenantId }
        });
        // 3. Verificar limite de instâncias do plano
        const maxInstances = tenant.plan?.maxInstances || 1;
        if (currentCount >= maxInstances) {
            throw new common_1.BadRequestException(`Limite de chips atingido para o plano ${tenant.plan?.name || 'contratado'} (${currentCount}/${maxInstances}). Por favor, faça um upgrade no seu plano nas configurações financeiras.`);
        }
        // Verificar se já existe uma instância com este nome
        const existing = await this.instanceRepo.findOne({
            where: { instanceName: data.instanceName }
        });
        if (existing) {
            throw new common_1.ConflictException(`Já existe uma instância com o nome "${data.instanceName}". Por favor, escolha outro nome ou exclua a existente.`);
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
                }
                else {
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
                status: isOfficial ? instance_status_enum_1.InstanceStatus.CONNECTING : instance_status_enum_1.InstanceStatus.CREATED,
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
        }
        catch (error) {
            this.logger.error(`Failed to create instance: ${error.message}`);
            // Verificar se é erro de duplicata do banco
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                throw new common_1.ConflictException(`Já existe uma instância com o nome "${data.instanceName}". Por favor, escolha outro nome.`);
            }
            throw error;
        }
    }
    async getQrCode(id, tenantId) {
        const instance = await this.findOne(id, tenantId);
        const provider = this.providerFactory.getProvider(instance.provider || 'evolution');
        try {
            return await provider.getQrCode(instance.instanceName);
        }
        catch (error) {
            // Auto-healing: if the instance does not exist in the provider container, recreate it
            if (error.message?.includes('404') ||
                error.message?.includes('not found') ||
                error.message?.includes('400') ||
                error.message?.includes('500')) {
                this.logger.warn(`Instance '${instance.instanceName}' missing or errored in provider container. Re-creating...`);
                const config = instance.channelType === 'official' ? instance.metaConfig : {};
                try {
                    await provider.createInstance(instance.instanceName, config);
                }
                catch (createErr) {
                    this.logger.error(`Auto-healing creation failed for ${instance.instanceName}: ${createErr.message}`);
                }
                // Try fetching the QR code again after creation
                return await provider.getQrCode(instance.instanceName);
            }
            throw error;
        }
    }
    async getPairingCode(id, tenantId, phoneNumber) {
        const instance = await this.findOne(id, tenantId);
        const provider = this.providerFactory.getProvider(instance.provider || 'evolution');
        if (provider.providerType !== 'evolution') {
            throw new common_1.ConflictException('Pairing code connection is only supported by Evolution API provider');
        }
        const adapter = provider;
        if (typeof adapter.getPairingCode !== 'function') {
            throw new common_1.ConflictException('Pairing code connection is not supported by the active provider version');
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
        }
        catch (deleteErr) {
            this.logger.warn(`Failed to delete instance '${instance.instanceName}' before pairing (normal if not present): ${deleteErr.message}`);
        }
        const config = instance.channelType === 'official' ? instance.metaConfig : {};
        try {
            await provider.createInstance(instance.instanceName, config);
            // Introduce a brief sleep to allow Baileys to initialize inside the Evolution container cleanly
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
        catch (createErr) {
            this.logger.error(`Recreation failed for '${instance.instanceName}' during pairing setup: ${createErr.message}`);
        }
        try {
            const result = await adapter.getPairingCode(instance.instanceName, formattedPhone);
            // Save the phone number that actually worked to ensure it is recorded correctly
            instance.phone = result.phone;
            await this.instanceRepo.save(instance);
            return result;
        }
        catch (error) {
            throw error;
        }
    }
    async getStatus(id, tenantId) {
        const instance = await this.findOne(id, tenantId);
        const provider = this.providerFactory.getProvider(instance.provider || 'evolution');
        const status = await provider.getStatus(instance.instanceName);
        let shouldSave = false;
        // Update instance status in DB
        if (status.status === instance_status_enum_1.InstanceStatus.CONNECTED && instance.status !== instance_status_enum_1.InstanceStatus.CONNECTED) {
            instance.status = instance_status_enum_1.InstanceStatus.CONNECTED;
            instance.connectedAt = new Date();
            shouldSave = true;
        }
        // Se o provedor retornar telefone e não tivermos, ou se o status for conectado agora
        if (status.status === instance_status_enum_1.InstanceStatus.CONNECTED && status.phoneNumber && !instance.phone) {
            instance.phone = status.phoneNumber.replace('@s.whatsapp.net', '');
            shouldSave = true;
        }
        if (shouldSave) {
            await this.instanceRepo.save(instance);
            // 🚀 GATILHO AUTOMÁTICO: Se acabou de conectar e o chip ainda tem maturidade 0, disparar o Scan de Raio-X
            if (status.status === instance_status_enum_1.InstanceStatus.CONNECTED && (!instance.warmupDay || instance.warmupDay === 0)) {
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
    async scanMaturity(id, tenantId) {
        const instance = await this.findOne(id, tenantId);
        if (instance.status !== instance_status_enum_1.InstanceStatus.CONNECTED) {
            throw new common_1.ConflictException('Chip must be connected to scan maturity');
        }
        const provider = this.providerFactory.getProvider(instance.provider || 'evolution');
        this.logger.log(`[SCAN] Starting maturity scan for ${instance.instanceName}...`);
        try {
            const metrics = await provider.getMaturityMetrics(instance.instanceName);
            const chatCount = metrics.chatCount || 0;
            const groupCount = metrics.groupCount || 0;
            let calculatedDay = 0;
            // 🧪 HEURÍSTICA DE MATURIDADE WHATSAAS:
            if (chatCount > 150)
                calculatedDay = 21; // Veterano Absoluto
            else if (chatCount > 80)
                calculatedDay = 18; // Veterano Avançado
            else if (chatCount > 40)
                calculatedDay = 14; // Maduro (Warmup Completo)
            else if (chatCount > 20)
                calculatedDay = 10; // Médio
            else if (chatCount > 10)
                calculatedDay = 7; // Ativo básico
            else if (chatCount > 3)
                calculatedDay = 3; // Em uso
            // Bônus de Grupo (Grupos dão + confianca no algoritmo Meta)
            if (groupCount > 10 && calculatedDay < 21)
                calculatedDay = Math.min(21, calculatedDay + 5);
            else if (groupCount > 3 && calculatedDay < 18)
                calculatedDay += 3;
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
        }
        catch (error) {
            this.logger.error(`Failed maturity scan: ${error.message}`);
            throw error;
        }
    }
    async update(id, tenantId, data) {
        const instance = await this.findOne(id, tenantId);
        // Manter integridade de metadados anteriores e mesclar novos configurações
        if (data.metaConfig) {
            const currentMeta = instance.metaConfig || {};
            data.metaConfig = {
                ...currentMeta,
                ...data.metaConfig
            };
            // Se o customDailyLimit mudou agora, aplique instantaneamente
            if ('customDailyLimit' in data.metaConfig) {
                const customLimit = Number(data.metaConfig.customDailyLimit);
                if (!isNaN(customLimit) && customLimit > 0) {
                    // Aleatoriza imediatamente ao salvar
                    const variation = (Math.random() * 0.3) - 0.15;
                    data.dailyLimit = Math.max(5, Math.round(customLimit * (1 + variation)));
                }
                else if (customLimit === 0) {
                    // Retorna para algum padrão para o dia atual ou deixa a CRON arrumar na madruga
                    // Vamos tentar puxar do histórico da cron se possível, ou pelo menos um valor seguro
                    data.dailyLimit = Math.max(50, instance.dailyLimit || 50);
                }
            }
        }
        // Atualizar ou criar detalhes do chip
        if (data.chipDetails) {
            if (!instance.chipDetail) {
                instance.chipDetail = new chip_detail_entity_1.ChipDetail();
            }
            // Sanitize empty strings for dates
            if (data.chipDetails.rechargeDate === '') {
                data.chipDetails.rechargeDate = null;
            }
            if (data.chipDetails.expirationDate === '') {
                data.chipDetails.expirationDate = null;
            }
            Object.assign(instance.chipDetail, data.chipDetails);
            delete data.chipDetails;
        }
        Object.assign(instance, data);
        return this.instanceRepo.save(instance);
    }
    async updateProxy(id, tenantId, proxyId) {
        const instance = await this.findOne(id, tenantId);
        instance.proxyId = proxyId;
        return this.instanceRepo.save(instance);
    }
    async delete(id, tenantId) {
        const instance = await this.findOne(id, tenantId);
        const provider = this.providerFactory.getProvider(instance.provider || 'evolution');
        try {
            await provider.deleteInstance(instance.instanceName);
        }
        catch (e) {
            this.logger.warn(`Failed to delete from provider: ${e.message}`);
            // Continue with DB deletion
        }
        // Se tinha proxy alocado, limpar o assignedInstanceId do proxy antes de remover a instância
        if (instance.proxyId) {
            try {
                await this.proxiesService.assignProxy(tenantId, instance.proxyId, null);
            }
            catch (e) {
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
};
exports.InstancesService = InstancesService;
exports.InstancesService = InstancesService = InstancesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(instance_entity_1.Instance)),
    __param(1, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        whatsapp_1.WhatsAppProviderFactory,
        proxies_service_1.ProxiesService])
], InstancesService);
