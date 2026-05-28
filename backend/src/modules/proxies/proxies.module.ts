import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProxyEntity } from './entities/proxy.entity';
import { ProxiesService } from './proxies.service';
import { ProxiesController } from './proxies.controller';
import { ProxyProviderFactory } from './providers/proxy-provider.factory';
import { WebshareAdapter } from './providers/webshare.adapter';
import { IPRoyalAdapter } from './providers/iproyal.adapter';

@Module({
    imports: [TypeOrmModule.forFeature([ProxyEntity])],
    controllers: [ProxiesController],
    providers: [
        ProxiesService,
        ProxyProviderFactory,
        WebshareAdapter,
        IPRoyalAdapter
    ],
    exports: [ProxiesService]
})
export class ProxiesModule {}
