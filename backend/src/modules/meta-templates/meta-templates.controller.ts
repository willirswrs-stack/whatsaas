import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MetaTemplatesService, WabaAccount } from './meta-templates.service';
import { MetaTemplate, BusinessProfile } from './meta-graph-api.service';
import { CreateWabaAccountDto, UpdateWabaProfileDto, CreateMetaTemplateDto } from './dto';

@Controller('meta-templates')
@UseGuards(JwtAuthGuard)
export class MetaTemplatesController {
    constructor(private readonly metaTemplatesService: MetaTemplatesService) { }

    // =====================================================
    // WABA ACCOUNTS ENDPOINTS
    // =====================================================

    /**
     * List all WABA accounts
     */
    @Get('accounts')
    async listAccounts(@Request() req): Promise<WabaAccount[]> {
        return this.metaTemplatesService.listWabaAccounts(req.user.tenantId);
    }

    /**
     * Create a new WABA account
     */
    @Post('accounts')
    async createAccount(
        @Request() req,
        @Body() dto: CreateWabaAccountDto,
    ): Promise<WabaAccount> {
        return this.metaTemplatesService.createWabaAccount(req.user.tenantId, dto);
    }

    /**
     * Get a single WABA account
     */
    @Get('accounts/:id')
    async getAccount(
        @Request() req,
        @Param('id') id: string,
    ): Promise<WabaAccount> {
        return this.metaTemplatesService.getWabaAccount(req.user.tenantId, id);
    }

    /**
     * Delete a WABA account
     */
    @Delete('accounts/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteAccount(
        @Request() req,
        @Param('id') id: string,
    ): Promise<void> {
        return this.metaTemplatesService.deleteWabaAccount(req.user.tenantId, id);
    }

    /**
     * Sync phone info (quality rating, display name)
     */
    @Post('accounts/:id/sync')
    async syncAccount(
        @Request() req,
        @Param('id') id: string,
    ): Promise<WabaAccount> {
        return this.metaTemplatesService.syncPhoneInfo(req.user.tenantId, id);
    }

    // =====================================================
    // PROFILE ENDPOINTS
    // =====================================================

    /**
     * Get business profile
     */
    @Get('accounts/:id/profile')
    async getProfile(
        @Request() req,
        @Param('id') id: string,
    ): Promise<BusinessProfile> {
        return this.metaTemplatesService.getBusinessProfile(req.user.tenantId, id);
    }

    /**
     * Update business profile
     */
    @Put('accounts/:id/profile')
    async updateProfile(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateWabaProfileDto,
    ): Promise<WabaAccount> {
        return this.metaTemplatesService.updateProfile(req.user.tenantId, id, dto);
    }

    // =====================================================
    // TEMPLATES ENDPOINTS
    // =====================================================

    /**
     * List all templates for an account
     */
    @Get('accounts/:id/templates')
    async listTemplates(
        @Request() req,
        @Param('id') id: string,
    ): Promise<MetaTemplate[]> {
        return this.metaTemplatesService.listTemplates(req.user.tenantId, id);
    }

    /**
     * Create a new template
     */
    @Post('accounts/:id/templates')
    async createTemplate(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: CreateMetaTemplateDto,
    ): Promise<{ id: string; status: string }> {
        return this.metaTemplatesService.createTemplate(req.user.tenantId, id, dto);
    }

    /**
     * Delete a template
     */
    @Delete('accounts/:id/templates/:templateName')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteTemplate(
        @Request() req,
        @Param('id') id: string,
        @Param('templateName') templateName: string,
    ): Promise<void> {
        await this.metaTemplatesService.deleteTemplate(req.user.tenantId, id, templateName);
    }
}
