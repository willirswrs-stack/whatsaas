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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ProxiesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxiesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const proxy_entity_1 = require("./entities/proxy.entity");
const proxy_provider_factory_1 = require("./providers/proxy-provider.factory");
const axios_1 = __importDefault(require("axios"));
const socks_proxy_agent_1 = require("socks-proxy-agent");
const https_proxy_agent_1 = require("https-proxy-agent");
let ProxiesService = ProxiesService_1 = class ProxiesService {
    proxyRepo;
    proxyProviderFactory;
    logger = new common_1.Logger(ProxiesService_1.name);
    constructor(proxyRepo, proxyProviderFactory) {
        this.proxyRepo = proxyRepo;
        this.proxyProviderFactory = proxyProviderFactory;
    }
    async getProxies(tenantId) {
        return this.proxyRepo.find({ where: { tenantId } });
    }
    async assignProxy(tenantId, proxyId, instanceId) {
        const proxy = await this.proxyRepo.findOne({ where: { id: proxyId, tenantId } });
        if (!proxy) {
            throw new Error('Proxy não encontrado para esta conta.');
        }
        proxy.assignedInstanceId = instanceId;
        await this.proxyRepo.save(proxy);
        this.logger.log(`Proxy ${proxyId} associado à instância ${instanceId || 'NENHUMA'}`);
        return proxy;
    }
    async createProxy(tenantId, data) {
        const proxy = this.proxyRepo.create({ ...data, tenantId });
        return this.proxyRepo.save(proxy);
    }
    async deleteProxy(id, tenantId) {
        const proxy = await this.proxyRepo.findOne({ where: { id, tenantId } });
        if (!proxy)
            throw new Error('Proxy not found');
        await this.proxyRepo.remove(proxy);
        return { success: true };
    }
    async testProxy(data) {
        const startTime = Date.now();
        const auth = data.username ? `${data.username}:${data.password}@` : '';
        const proxyUrl = `${data.type}://${auth}${data.host}:${data.port}`;
        try {
            this.logger.log(`[PROXY TEST] Iniciando teste para: ${data.type}://${data.host}:${data.port}`);
            let agent;
            if (data.type.includes('socks')) {
                agent = new socks_proxy_agent_1.SocksProxyAgent(proxyUrl);
            }
            else {
                agent = new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
            }
            const response = await axios_1.default.get('https://api.ipify.org?format=json', {
                httpsAgent: agent,
                httpAgent: agent,
                timeout: 8000
            });
            const latency = Date.now() - startTime;
            this.logger.log(`[PROXY TEST] ✅ Sucesso! IP retornado: ${response.data?.ip} | Latência: ${latency}ms`);
            return { online: true, latencyMs: latency, ip: response.data?.ip };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            this.logger.warn(`[PROXY TEST] ❌ Falha no teste: ${error.message}`);
            return {
                online: false,
                latencyMs: latency,
                error: error.message || 'Tempo limite excedido ou proxy recusou a conexão.'
            };
        }
    }
    async getUnassignedProxy(tenantId) {
        return this.proxyRepo
            .createQueryBuilder('proxy')
            .leftJoin('proxy.instances', 'instance')
            .where('proxy.tenantId = :tenantId', { tenantId })
            .andWhere('instance.id IS NULL')
            .getOne();
    }
    /**
     * Adquire ou aloca um Proxy ISP (Webshare ou IPRoyal) para a conta do cliente.
     */
    async buyProxyFromProvider(tenantId) {
        this.logger.log(`[PROXIES SERVICE] Iniciando alocação automática de Proxy para tenant: ${tenantId}`);
        // Obter o adaptador ativo da Factory (Webshare ou IPRoyal)
        const provider = this.proxyProviderFactory.getProvider();
        // Buscar proxies atuais já alocados para este tenant para checar duplicidades no pool
        const currentProxies = await this.getProxies(tenantId);
        // Chamar o provedor para obter credenciais do proxy alocado
        const proxyData = await provider.buyOrAllocateProxy(tenantId, currentProxies);
        // Criar o registro na tabela de proxies do WhatSaas
        const newProxy = this.proxyRepo.create({
            tenantId,
            provider: proxyData.provider,
            host: proxyData.host,
            port: proxyData.port,
            username: proxyData.username || '',
            password: proxyData.password || '',
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias de validade
            status: 'active'
        });
        await this.proxyRepo.save(newProxy);
        this.logger.log(`✅ [PROXIES SERVICE] Sucesso! Proxy ${newProxy.host}:${newProxy.port} (${newProxy.provider}) registrado para a conta.`);
        return newProxy;
    }
};
exports.ProxiesService = ProxiesService;
exports.ProxiesService = ProxiesService = ProxiesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(proxy_entity_1.ProxyEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        proxy_provider_factory_1.ProxyProviderFactory])
], ProxiesService);
