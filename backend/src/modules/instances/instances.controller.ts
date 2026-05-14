import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

import { InstancesService } from './instances.service';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { ChipHealthService } from '../anti-ban/chip-health.service';
import type { ProviderType } from '../whatsapp';

class CreateInstanceDto {
    @IsString()
    instanceName: string;

    @IsOptional()
    @IsString()
    proxyId?: string;

    @IsOptional()
    @IsIn(['waha', 'evolution'])
    provider?: ProviderType;

    @IsOptional()
    config?: Record<string, any>;
}

@ApiTags('instances')
@ApiBearerAuth()
@Controller('instances')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class InstancesController {
    constructor(
        private readonly instancesService: InstancesService,
        private readonly chipHealthService: ChipHealthService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List all instances' })
    async findAll(@CurrentTenant() tenantId: string) {
        return this.instancesService.findAll(tenantId);
    }

    @Get('providers')
    @ApiOperation({ summary: 'List available WhatsApp providers' })
    async getProviders() {
        return {
            providers: this.instancesService.getAvailableProviders(),
        };
    }

    // Proxies - DEVE ficar antes das rotas com :id para evitar conflito
    @Get('proxies')
    @ApiOperation({ summary: 'List all proxies' })
    async findAllProxies(@CurrentTenant() tenantId: string) {
        return this.instancesService.findAllProxies(tenantId);
    }

    @Post('proxies')
    @ApiOperation({ summary: 'Create a new proxy' })
    async createProxy(
        @Body() data: { host: string; port: number; type?: string; username?: string; password?: string },
        @CurrentTenant() tenantId: string,
    ) {
        return this.instancesService.createProxy(tenantId, data);
    }

    @Post('proxies/test')
    @ApiOperation({ summary: 'Test a proxy connection validity' })
    async testProxy(
        @Body() data: { host: string; port: number; type: string; username?: string; password?: string },
    ) {
        return this.instancesService.testProxy(data);
    }

    // Rotas com parâmetros dinâmicos - devem ficar por último
    @Patch(':id')
    @ApiOperation({ summary: 'Update instance configuration' })
    async update(
        @Param('id') id: string,
        @Body() data: { proxyId?: string; warmupEnabled?: boolean; metaConfig?: Record<string, any> },
        @CurrentTenant() tenantId: string,
    ) {
        return this.instancesService.update(id, tenantId, data as any);
    }

    @Patch(':id/warmup')
    @ApiOperation({ summary: 'Toggle warmup mode for instance' })
    async toggleWarmup(
        @Param('id') id: string,
        @Body() body: { enabled: boolean },
        @CurrentTenant() tenantId: string,
    ) {
        return this.instancesService.update(id, tenantId, { warmupEnabled: body.enabled } as any);
    }

    // Rotas com parâmetros dinâmicos - devem ficar por último
    @Get(':id')
    @ApiOperation({ summary: 'Get instance by ID' })
    async findOne(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.instancesService.findOne(id, tenantId);
    }

    @Post(':id/scan-maturity')
    @ApiOperation({ summary: 'Scan instance maturity' })
    async scanMaturity(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.instancesService.scanMaturity(id, tenantId);
    }

    @Get(':id/health')
    @ApiOperation({ summary: 'Get health score for instance' })
    async getHealth(@Param('id') id: string) {
        const score = await this.chipHealthService.calculateHealthScore(id);
        const status = await this.chipHealthService.getHealthStatus(id);
        return { instanceId: id, score, status };
    }

    @Get(':id/status')
    @ApiOperation({ summary: 'Get instance connection status' })
    async getStatus(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.instancesService.getStatus(id, tenantId);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new instance' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                instanceName: { type: 'string', example: 'meu-whats' },
                proxyId: { type: 'string', example: 'uuid', nullable: true },
                provider: { type: 'string', enum: ['evolution', 'waha'], default: 'evolution' },
            },
            required: ['instanceName'],
        },
    })
    async create(
        @Body() data: CreateInstanceDto,
        @CurrentTenant() tenantId: string,
    ) {
        return this.instancesService.create(tenantId, data);
    }

    @Get(':id/qr')
    @ApiOperation({ summary: 'Get QR code for instance' })
    async getQrCode(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        const qrCode = await this.instancesService.getQrCode(id, tenantId);
        return { qrCode };
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete instance' })
    async delete(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.instancesService.delete(id, tenantId);
    }
}

