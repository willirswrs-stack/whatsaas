import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
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

    @Post()
    async createProxy(@Request() req, @Body() data: any) {
        const tenantId = req.user.tenantId;
        return this.proxiesService.createProxy(tenantId, data);
    }

    @Delete(':id')
    async deleteProxy(@Request() req, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        return this.proxiesService.deleteProxy(id, tenantId);
    }

    @Post('test')
    async testProxy(@Body() data: any) {
        return this.proxiesService.testProxy(data);
    }
}
