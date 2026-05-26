import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProxyEntity } from './entities/proxy.entity';

@Injectable()
export class ProxiesService {
    private readonly logger = new Logger(ProxiesService.name);

    constructor(
        @InjectRepository(ProxyEntity)
        private proxyRepo: Repository<ProxyEntity>
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

    /**
     * Bate na API da IPRoyal para comprar o Proxy Residencial Estático de 30 dias.
     */
    async buyProxyFromProvider(tenantId: string): Promise<ProxyEntity> {
        this.logger.log(`Iniciando compra de Proxy ISP na IPRoyal para o tenant: ${tenantId}`);

        // AQUI ENTRA A INTEGRAÇÃO REAL COM A API DA IPROYAL
        // POST https://api.iproyal.com/v1/reseller/residential/buy
        // Authorization: Bearer {IPROYAL_API_KEY}
        
        // MOCK/SIMULAÇÃO: Como ainda não injetamos o cartão na IPRoyal, 
        // vamos simular uma resposta de sucesso da API.
        
        const mockHost = `isp-us-${Math.floor(Math.random() * 10000)}.iproyal.com`;
        const mockPort = `${Math.floor(Math.random() * 10000 + 10000)}`;
        const mockUser = `usr_${tenantId.substring(0,6)}`;
        const mockPass = `pass_${Math.random().toString(36).substring(2, 10)}`;

        const newProxy = this.proxyRepo.create({
            tenantId,
            provider: 'iproyal_isp',
            host: mockHost,
            port: mockPort,
            username: mockUser,
            password: mockPass,
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
            status: 'active'
        });

        await this.proxyRepo.save(newProxy);
        this.logger.log(`✅ Sucesso! Proxy ${newProxy.host}:${newProxy.port} comprado e ativado para a conta.`);
        
        return newProxy;
    }
}
