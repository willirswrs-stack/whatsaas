import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContactsService } from './contacts.service';
import {
    CreateContactDto,
    UpdateContactDto,
    ContactQueryDto,
    CreateTagDto,
    UpdateTagDto,
    CreateCustomFieldDto,
    UpdateCustomFieldDto,
    ImportContactsDto,
    BulkAddTagsDto,
    BulkRemoveTagsDto,
    VerifyContactsDto,
} from './dto';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    // ============ CONTACTS - Specific routes FIRST ============

    @Get()
    async findAll(@Request() req, @Query() query: ContactQueryDto) {
        console.log('--- [CONTROLLER] findAll called ---');
        console.log('User:', req.user);
        console.log('Query:', query);
        const result = await this.contactsService.findAllContacts(req.user.tenantId, query);
        console.log('Service returned:', {
            total: result.total,
            dataLength: result.data?.length,
            firstItem: result.data?.[0] ? { id: result.data[0].id, name: result.data[0].name } : 'None'
        });
        return result;
    }

    @Get('stats')
    async getStats(@Request() req) {
        return this.contactsService.getContactStats(req.user.tenantId);
    }

    @Get('export')
    async exportContacts(@Request() req, @Query('tagIds') tagIds?: string) {
        const tagIdArray = tagIds ? tagIds.split(',') : undefined;
        return this.contactsService.exportContacts(req.user.tenantId, tagIdArray);
    }

    @Post()
    async create(@Request() req, @Body() dto: CreateContactDto) {
        return this.contactsService.createContact(req.user.tenantId, dto);
    }

    @Post('import')
    async importContacts(@Request() req, @Body() dto: ImportContactsDto) {
        return this.contactsService.importContacts(req.user.tenantId, dto.contacts);
    }

    @Post('import/whatsapp')
    async importFromWhatsApp(@Request() req, @Body('instanceId') instanceId: string) {
        if (!instanceId) {
            throw new BadRequestException('ID da instância é obrigatório');
        }
        return this.contactsService.importFromWhatsApp(req.user.tenantId, instanceId);
    }

    @Post('import/file')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
        fileFilter: (req, file, callback) => {
            if (file.mimetype.includes('spreadsheet') ||
                file.mimetype.includes('excel') ||
                file.mimetype.includes('csv') ||
                file.originalname.match(/\.(xlsx|csv|xls)$/)) {
                callback(null, true);
            } else {
                callback(new BadRequestException('Apenas arquivos .csv, .xls ou .xlsx são permitidos'), false);
            }
        }
    }))
    @HttpCode(HttpStatus.OK)
    async importContactsFile(
        @Request() req,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) {
            throw new BadRequestException('Nenhum arquivo enviado');
        }
        return this.contactsService.parseAndImportHeaderFile(req.user.tenantId, file.buffer, file.mimetype);
    }

    @Post('bulk/add-tags')
    async bulkAddTags(@Request() req, @Body() dto: BulkAddTagsDto) {
        return this.contactsService.bulkAddTags(req.user.tenantId, dto);
    }

    @Post('bulk/remove-tags')
    async bulkRemoveTags(@Request() req, @Body() dto: BulkRemoveTagsDto) {
        return this.contactsService.bulkRemoveTags(req.user.tenantId, dto);
    }

    @Post('bulk/delete')
    @HttpCode(HttpStatus.OK)
    async bulkDelete(@Request() req, @Body('ids') ids: string[]) {
        return this.contactsService.bulkDeleteContacts(req.user.tenantId, ids);
    }

    @Post('verify')
    @HttpCode(HttpStatus.OK)
    async verifyContacts(@Request() req, @Body() dto: VerifyContactsDto) {
        return this.contactsService.verifyContacts(
            req.user.tenantId,
            dto.instanceName,
            dto.contactIds,
            dto.providerType,
        );
    }

    // ============ TAGS - All specific routes ============

    @Get('tags/list')
    async findAllTags(@Request() req) {
        return this.contactsService.findAllTags(req.user.tenantId);
    }

    @Post('tags')
    async createTag(@Request() req, @Body() dto: CreateTagDto) {
        return this.contactsService.createTag(req.user.tenantId, dto);
    }

    @Get('tags/:id')
    async findTag(@Request() req, @Param('id') id: string) {
        return this.contactsService.findTagById(req.user.tenantId, id);
    }

    @Put('tags/:id')
    async updateTag(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateTagDto,
    ) {
        return this.contactsService.updateTag(req.user.tenantId, id, dto);
    }

    @Delete('tags/:id')
    async deleteTag(@Request() req, @Param('id') id: string) {
        return this.contactsService.deleteTag(req.user.tenantId, id);
    }

    // ============ CUSTOM FIELDS - All specific routes ============

    @Get('fields/list')
    async findAllFields(@Request() req) {
        return this.contactsService.findAllCustomFields(req.user.tenantId);
    }

    @Post('fields')
    async createField(@Request() req, @Body() dto: CreateCustomFieldDto) {
        return this.contactsService.createCustomField(req.user.tenantId, dto);
    }

    @Put('fields/:id')
    async updateField(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateCustomFieldDto,
    ) {
        return this.contactsService.updateCustomField(req.user.tenantId, id, dto);
    }

    @Delete('fields/:id')
    async deleteField(@Request() req, @Param('id') id: string) {
        return this.contactsService.deleteCustomField(req.user.tenantId, id);
    }

    // ============ CONTACTS - Parameterized routes LAST ============

    @Get(':id')
    async findOne(@Request() req, @Param('id') id: string) {
        return this.contactsService.findContactById(req.user.tenantId, id);
    }

    @Put(':id')
    async update(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateContactDto,
    ) {
        return this.contactsService.updateContact(req.user.tenantId, id, dto);
    }

    @Delete(':id')
    async delete(@Request() req, @Param('id') id: string) {
        return this.contactsService.deleteContact(req.user.tenantId, id);
    }
}
