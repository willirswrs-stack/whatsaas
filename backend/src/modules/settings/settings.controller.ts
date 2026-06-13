import { Controller, Get, Put, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-tenant.decorator';
import type { UserPayload } from '../auth/decorators/current-tenant.decorator';
import { SettingsService } from './settings.service';
import type { GlobalConfig } from './settings.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    // ─── Settings do Tenant (qualquer usuário autenticado) ────────────

    @Get()
    @ApiOperation({ summary: 'Get tenant settings' })
    async getSettings(@CurrentTenant() tenantId: string) {
        return this.settingsService.getSettings(tenantId);
    }

    @Put()
    @ApiOperation({ summary: 'Update tenant settings' })
    async updateSettings(
        @CurrentTenant() tenantId: string,
        @Body() data: UpdateTenantSettingsDto,
    ) {
        await this.settingsService.updateSettings(tenantId, data);
        return { success: true, message: 'Settings updated successfully' };
    }

    // ─── Configurações Globais (Super Admin Only) ─────────────────────

    @Get('global')
    @ApiOperation({ summary: '[Super Admin] Get global platform settings' })
    async getGlobalSettings(@CurrentUser() user: UserPayload) {
        if (user?.role !== 'super_admin') {
            throw new ForbiddenException('Apenas Super Admins podem acessar configurações globais.');
        }
        return this.settingsService.getGlobalSettings();
    }

    @Put('global')
    @ApiOperation({ summary: '[Super Admin] Update global platform settings' })
    async updateGlobalSettings(
        @CurrentUser() user: UserPayload,
        @Body() data: GlobalConfig,
    ) {
        if (user?.role !== 'super_admin') {
            throw new ForbiddenException('Apenas Super Admins podem alterar configurações globais.');
        }
        await this.settingsService.updateGlobalSettings(data);
        return { success: true, message: 'Global settings updated successfully' };
    }

    /**
     * Endpoint público (autenticado) para que qualquer usuário possa ler
     * configurações globais não-sensíveis (LLM ativo, dias de warmup).
     * Chaves de API não são retornadas aqui.
     */
    @Get('global/public')
    @ApiOperation({ summary: 'Get public global settings (LLM info, warmup days)' })
    async getPublicGlobalSettings() {
        const config = await this.settingsService.getGlobalSettings();
        // Retornar apenas campos não-sensíveis
        return {
            globalLlmProvider: config.globalLlmProvider,
            globalLlmModel: config.globalLlmModel,
            globalLlmTemperature: config.globalLlmTemperature,
            globalLlmMaxTokens: config.globalLlmMaxTokens,
            warmupDaysColdOutbound: config.warmupDaysColdOutbound,
            warmupDaysWarmOutbound: config.warmupDaysWarmOutbound,
            warmupDaysGroups: config.warmupDaysGroups,
            warmupDaysInbound: config.warmupDaysInbound,
        };
    }
}
