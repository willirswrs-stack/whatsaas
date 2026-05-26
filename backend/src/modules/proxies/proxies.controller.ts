import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProxiesService } from './proxies.service';

@UseGuards(AuthGuard('jwt'))
@Controller('proxies')
export class ProxiesController {
    constructor(private readonly proxiesService: ProxiesService) {}

    @Get()
    async getProxies(@Request() req) {
        const tenantId = req.user.tenantId;
        return this.proxiesService.getProxies(tenantId);
    }

    @Post('assign')
    async assignProxy(@Request() req, @Body() body: { proxyId: string, instanceId: string | null }) {
        const tenantId = req.user.tenantId;
        return this.proxiesService.assignProxy(tenantId, body.proxyId, body.instanceId);
    }
}
