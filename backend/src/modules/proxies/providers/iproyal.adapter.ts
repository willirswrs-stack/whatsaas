import { Injectable, Logger } from '@nestjs/common';
import { IProxyProvider } from './proxy-provider.interface';

@Injectable()
export class IPRoyalAdapter implements IProxyProvider {
    private readonly logger = new Logger(IPRoyalAdapter.name);

    async buyOrAllocateProxy(tenantId: string, currentProxies: any[]): Promise<{
        host: string;
        port: string;
        username?: string;
        password?: string;
        provider: string;
        type: string;
    }> {
        this.logger.log(`[IPROYAL ADAPTER] Simulando aquisição de IP dedicado sob demanda para tenant ${tenantId}`);

        const mockHost = `isp-us-${Math.floor(Math.random() * 10000)}.iproyal.com`;
        const mockPort = `${Math.floor(Math.random() * 10000 + 10000)}`;
        const mockUser = `usr_${tenantId.substring(0, 6)}`;
        const mockPass = `pass_${Math.random().toString(36).substring(2, 10)}`;

        return {
            host: mockHost,
            port: mockPort,
            username: mockUser,
            password: mockPass,
            provider: 'iproyal_isp',
            type: 'socks5'
        };
    }
}
