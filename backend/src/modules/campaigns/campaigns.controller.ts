import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { CampaignsService } from './campaigns.service';
import { DispatcherProcessor } from '../dispatcher/dispatcher.processor';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

// Local interface for uploaded file to avoid @types/multer dependency
interface UploadedFileType {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}


@ApiTags('campaigns')
@ApiBearerAuth()
@Controller('campaigns')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class CampaignsController {
    constructor(
        private readonly campaignsService: CampaignsService,
        private readonly dispatcherProcessor: DispatcherProcessor,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List all campaigns' })
    async findAll(
        @Query() query: PaginationQueryDto,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.findAll(tenantId, query);
    }

    @Get('contact-stats')
    async getGlobalContactStats(@CurrentTenant() tenantId: string) {
        const stats = await this.campaignsService.getGlobalContactStats(tenantId);
        const list = await this.campaignsService.findAllContacts(tenantId, { limit: 5 } as any);
        return {
            stats,
            sampleList: list
        };
    }

    // Templates - DEVE VIR ANTES de :id para evitar conflito
    @Get('templates')
    @ApiOperation({ summary: 'List all templates' })
    async findAllTemplates(@CurrentTenant() tenantId: string) {
        return this.campaignsService.findAllTemplates(tenantId);
    }

    @Post('templates')
    @ApiOperation({ summary: 'Create a new template' })
    async createTemplate(
        @Body() data: { name: string; content: string; contentType?: string },
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.createTemplate(tenantId, data);
    }

    // Contacts - DEVE VIR ANTES de :id para evitar conflito
    @Get('contacts')
    @ApiOperation({ summary: 'List all contacts' })
    async findAllContacts(
        @Query() query: PaginationQueryDto,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.findAllContacts(tenantId, query);
    }

    @Post('contacts')
    @ApiOperation({ summary: 'Create a new contact' })
    async createContact(
        @Body() data: { phone: string; name?: string; customFields?: any },
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.createContact(tenantId, data);
    }

    @Post('contacts/import')
    @ApiOperation({ summary: 'Import contacts from CSV file' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    async importContacts(
        @UploadedFile() file: UploadedFileType,
        @CurrentTenant() tenantId: string,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Parse CSV content
        const content = file.buffer.toString('utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            throw new BadRequestException('CSV file must have at least a header and one data row');
        }

        // Parse header
        const header = lines[0].toLowerCase().split(',').map(h => h.trim());
        const phoneIndex = header.findIndex(h => h === 'telefone' || h === 'phone' || h === 'celular');
        const nameIndex = header.findIndex(h => h === 'nome' || h === 'name');
        const emailIndex = header.findIndex(h => h === 'email');
        const tagsIndex = header.findIndex(h => h === 'tags' || h === 'tag');

        if (phoneIndex === -1) {
            throw new BadRequestException('CSV must have a "telefone" or "phone" column');
        }

        // Parse rows
        const contacts: Array<{ phone: string; name?: string; email?: string; tags?: string[] }> = [];
        let failed = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            const phone = values[phoneIndex];

            if (!phone) {
                failed++;
                continue;
            }

            contacts.push({
                phone: phone.replace(/\D/g, ''),
                name: nameIndex >= 0 ? values[nameIndex] : undefined,
                email: emailIndex >= 0 ? values[emailIndex] : undefined,
                tags: tagsIndex >= 0 && values[tagsIndex] ? values[tagsIndex].split(';').map(t => t.trim()) : undefined,
            });
        }

        // Import to database
        const imported = await this.campaignsService.importContacts(tenantId, contacts);

        return {
            imported: imported.length,
            failed,
            total: lines.length - 1,
        };
    }

    @Post('warmup-override')
    @ApiOperation({ summary: 'Respond to warmup limit alert (override or pause)' })
    async warmupOverride(
        @Body() body: { instanceId: string; action: 'override' | 'pause' },
        @CurrentTenant() tenantId: string,
    ) {
        if (!body.instanceId || !['override', 'pause'].includes(body.action)) {
            throw new BadRequestException('instanceId and action (override|pause) are required');
        }
        this.dispatcherProcessor.handleWarmupLimitResponse(body.instanceId, body.action);
        return {
            success: true,
            message: body.action === 'override'
                ? `Warmup limit override granted for instance ${body.instanceId}. Sending will continue.`
                : `Instance ${body.instanceId} will remain paused to protect chip health.`,
        };
    }

    // Rotas com :id - DEVEM VIR POR ÚLTIMO
    @Get(':id')
    @ApiOperation({ summary: 'Get campaign by ID' })
    async findOne(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.findOne(id, tenantId);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new campaign' })
    async create(
        @Body() createCampaignDto: CreateCampaignDto,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.create(tenantId, createCampaignDto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an existing campaign' })
    async update(
        @Param('id') id: string,
        @Body() updateCampaignDto: UpdateCampaignDto,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.update(id, tenantId, updateCampaignDto);
    }

    @Post(':id/generate-variations')
    @ApiOperation({ summary: 'Generate AI message variations' })
    async generateVariations(
        @Param('id') id: string,
        @Body() options: { count: number; creativity?: number; provider?: 'openai' | 'anthropic' },
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.generateVariations(id, tenantId, options);
    }

    @Post(':id/start')
    @ApiOperation({ summary: 'Start campaign' })
    async start(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.start(id, tenantId);
    }

    @Post(':id/pause')
    @ApiOperation({ summary: 'Pause campaign' })
    async pause(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.pause(id, tenantId);
    }

    @Post(':id/resume')
    @ApiOperation({ summary: 'Resume paused campaign' })
    async resume(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.resume(id, tenantId);
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Cancel campaign' })
    async cancel(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.cancel(id, tenantId);
    }

    @Post(':id/retry')
    @ApiOperation({ summary: 'Retry failed contacts' })
    async retryFailed(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.retryFailed(id, tenantId);
    }


    @Post(':id/schedule')
    @ApiOperation({ summary: 'Schedule campaign start' })
    async schedule(
        @Param('id') id: string,
        @Body() body: { scheduledAt: string },
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.schedule(id, tenantId, body.scheduledAt);
    }

    @Post(':id/duplicate')
    @ApiOperation({ summary: 'Duplicate campaign' })
    async duplicate(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.duplicate(id, tenantId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete campaign' })
    async delete(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.delete(id, tenantId);
    }

    @Get(':id/contacts')
    @ApiOperation({ summary: 'Get campaign contacts (with status)' })
    async getCampaignContacts(
        @Param('id') id: string,
        @Query() query: PaginationQueryDto & { status?: string },
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.findCampaignContacts(id, tenantId, query);
    }

    @Get(':id/stats')
    @ApiOperation({ summary: 'Get campaign statistics' })
    async getStats(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.getStats(id, tenantId);
    }

    @Get(':id/estimate')
    @ApiOperation({ summary: 'Get campaign completion estimate' })
    async getEstimate(
        @Param('id') id: string,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.getEstimate(id, tenantId);
    }
}


