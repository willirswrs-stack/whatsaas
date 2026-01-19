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
}

@ApiTags('instances')
@ApiBearerAuth()
@Controller('instances')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class InstancesController {
    constructor(private readonly instancesService: InstancesService) { }

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

    // Rotas com parâmetros dinâmicos - devem ficar por último
    @Patch(':id')
    @ApiOperation({ summary: 'Update instance configuration' })
    async update(
        @Param('id') id: string,
        @Body() data: { proxyId?: string },
        @CurrentTenant() tenantId: string,
    ) {
        return this.instancesService.update(id, tenantId, data as any);
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

