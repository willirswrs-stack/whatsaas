import { Injectable, Logger } from '@nestjs/common';
import { IProxyProvider } from './proxy-provider.interface';
import { WebshareAdapter } from './webshare.adapter';
import { IPRoyalAdapter } from './iproyal.adapter';

@Injectable()
export class ProxyProviderFactory {
    private readonly logger = new Logger(ProxyProviderFactory.name);

    constructor(
        private readonly webshareAdapter: WebshareAdapter,
        private readonly iproyalAdapter: IPRoyalAdapter
    ) {}

    getProvider(): IProxyProvider {
        const providerName = (process.env.DEFAULT_PROXY_PROVIDER || 'webshare').toLowerCase();

        this.logger.log(`[PROXY FACTORY] Selecionando provedor ativo: ${providerName}`);

        if (providerName === 'iproyal') {
            return this.iproyalAdapter;
        }

        // Webshare por padrão
        return this.webshareAdapter;
    }
}
