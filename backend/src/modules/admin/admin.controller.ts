import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Post('features/toggle')
    @ApiOperation({ summary: 'Ativa ou desativa um recurso global do sistema' })
    async toggleFeature(@Body() body: { name: string, status: boolean }) {
        return this.adminService.toggleFeature(body.name, body.status);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Busca estatísticas globais do sistema' })
    async getGlobalStats() {
        return this.adminService.getGlobalStats();
    }

    @Get('tenants')
    @ApiOperation({ summary: 'Lista todos os tenants/clientes cadastrados' })
    async getAllTenants() {
        return this.adminService.getAllTenants();
    }

    @Get('plans')
    @ApiOperation({ summary: 'Lista planos configurados no sistema' })
    async getAllPlans() {
        return this.adminService.getAllPlans();
    }

    @Post('tenants')
    @ApiOperation({ summary: 'Cria um novo cliente/empresa manualmente com usuário admin inicial' })
    async createManualTenant(
        @Body() data: { name: string; email: string; planId?: string; userName: string; userEmail: string; passwordHash: string }
    ) {
        return this.adminService.createManualTenant(data);
    }

    @Patch('tenants/:id/status')
    @ApiOperation({ summary: 'Atualiza o status (bloqueio/desbloqueio) de um cliente' })
    async updateTenantStatus(
        @Param('id') id: string,
        @Body() body: { status: 'active' | 'suspended' | 'trial' }
    ) {
        return this.adminService.updateTenantStatus(id, body.status);
    }

    @Get('tenants/:id')
    @ApiOperation({ summary: 'Busca detalhes profundos de um cliente' })
    async getTenantDetails(@Param('id') id: string) {
        return this.adminService.getTenantDetails(id);
    }

    @Patch('tenants/:id')
    @ApiOperation({ summary: 'Atualiza dados cadastrais e metadados flexíveis de um cliente' })
    async updateTenant(
        @Param('id') id: string,
        @Body() body: any
    ) {
        return this.adminService.updateTenant(id, body);
    }

    @Patch('tenants/:id/plan')
    @ApiOperation({ summary: 'Vincula plano e ciclo de cobrança de um cliente' })
    async updateTenantPlan(
        @Param('id') id: string,
        @Body() body: { planId: string, billingCycle?: string, trialEndsAt?: string }
    ) {
        return this.adminService.updateTenantPlan(id, body);
    }

    @Get('logs')
    @ApiOperation({ summary: 'Obtém os logs de sistema recentes' })
    async getRecentLogs() {
        return this.adminService.getRecentLogs();
    }

    @Get('apis')
    @ApiOperation({ summary: 'Obtém as configurações globais de APIs' })
    async getApiSettings() {
        return this.adminService.getApiSettings();
    }

    @Patch('apis')
    @ApiOperation({ summary: 'Atualiza as configurações globais de APIs' })
    async updateApiSettings(@Body() body: any) {
        return this.adminService.updateApiSettings(body);
    }
}
