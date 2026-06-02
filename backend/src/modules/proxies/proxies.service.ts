import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProxyEntity } from './entities/proxy.entity';
import { ProxyProviderFactory } from './providers/proxy-provider.factory';
import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

@Injectable()
export class ProxiesService {
    private readonly logger = new Logger(ProxiesService.name);

    constructor(
        @InjectRepository(ProxyEntity)
        private proxyRepo: Repository<ProxyEntity>,
        private proxyProviderFactory: ProxyProviderFactory
    ) {}

    async getProxies(tenantId: string): Promise<ProxyEntity[]> {
        return this.proxyRepo.find({ where: { tenantId } });
    }

    async assignProxy(tenantId: string, proxyId: string, instanceId: string | null): Promise<ProxyEntity> {
        const proxy = await this.proxyRepo.findOne({ where: { id: proxyId, tenantId } });
        if (!proxy) {
            throw new Error('Proxy não encontrado para esta conta.');
        }

        proxy.assignedInstanceId = instanceId;
        await this.proxyRepo.save(proxy);
        
        this.logger.log(`Proxy ${proxyId} associado à instância ${instanceId || 'NENHUMA'}`);
        return proxy;
    }

    async createProxy(tenantId: string, data: Partial<ProxyEntity>) {
        const proxy = this.proxyRepo.create({ ...data, tenantId });
        return this.proxyRepo.save(proxy);
    }

    async deleteProxy(id: string, tenantId: string) {
        const proxy = await this.proxyRepo.findOne({ where: { id, tenantId } });
        if (!proxy) throw new Error('Proxy not found');
        await this.proxyRepo.remove(proxy);
        return { success: true };
    }

    async testProxy(data: {
        host: string;
        port: string;
        type: string;
        username?: string;
        password?: string;
    }) {
        const startTime = Date.now();
        const auth = data.username ? `${data.username}:${data.password}@` : '';
        const proxyUrl = `${data.type}://${auth}${data.host}:${data.port}`;
        
        try {
            this.logger.log(`[PROXY TEST] Iniciando teste para: ${data.type}://${data.host}:${data.port}`);
            let agent: any;
            
            if (data.type.includes('socks')) {
                agent = new SocksProxyAgent(proxyUrl);
            } else {
                agent = new HttpsProxyAgent(proxyUrl);
            }

            const response = await axios.get('https://api.ipify.org?format=json', {
                httpsAgent: agent,
                httpAgent: agent,
                timeout: 8000
            });

            const latency = Date.now() - startTime;
            this.logger.log(`[PROXY TEST] ✅ Sucesso! IP retornado: ${response.data?.ip} | Latência: ${latency}ms`);
            
            return { online: true, latencyMs: latency, ip: response.data?.ip };
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

    async getUnassignedProxy(tenantId: string): Promise<ProxyEntity | null> {
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
    async buyProxyFromProvider(tenantId: string): Promise<ProxyEntity> {
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
}
