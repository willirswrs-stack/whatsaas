import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    @ApiOperation({ summary: 'Get tenant settings' })
    async getSettings(@CurrentTenant() tenantId: string) {
        return this.settingsService.getSettings(tenantId);
    }

    @Put()
    @ApiOperation({ summary: 'Update tenant settings' })
    async updateSettings(
        @CurrentTenant() tenantId: string,
        @Body() data: {
            openaiKey?: string;
            anthropicKey?: string;
            geminiKey?: string;
            groqKey?: string;
            elevenLabsKey?: string;
        },
    ) {
        await this.settingsService.updateSettings(tenantId, data);
        return { success: true, message: 'Settings updated successfully' };
    }
}
