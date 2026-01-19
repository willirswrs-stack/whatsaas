import {
    Controller,
    Get,
    Post,
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
import { CreateCampaignDto } from './dto/create-campaign.dto';
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
    constructor(private readonly campaignsService: CampaignsService) { }

    @Get()
    @ApiOperation({ summary: 'List all campaigns' })
    async findAll(
        @Query() query: PaginationQueryDto,
        @CurrentTenant() tenantId: string,
    ) {
        return this.campaignsService.findAll(tenantId, query);
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
}
