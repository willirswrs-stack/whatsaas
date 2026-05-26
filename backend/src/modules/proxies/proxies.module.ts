import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProxyEntity } from './entities/proxy.entity';
import { ProxiesService } from './proxies.service';
import { ProxiesController } from './proxies.controller';

@Module({
    imports: [TypeOrmModule.forFeature([ProxyEntity])],
    controllers: [ProxiesController],
    providers: [ProxiesService],
    exports: [ProxiesService]
})
export class ProxiesModule {}
