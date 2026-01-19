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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FoldersService } from './folders.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
    constructor(private readonly foldersService: FoldersService) { }

    @Get()
    async findAll(@Request() req, @Query('archived') archived?: string) {
        const includeArchived = archived === 'true';
        return this.foldersService.findAll(req.user.tenantId, includeArchived);
    }

    @Get('archived')
    async getArchived(@Request() req) {
        return this.foldersService.getArchivedFolders(req.user.tenantId);
    }

    @Get('root')
    async getRootFolders(@Request() req) {
        return this.foldersService.findRootFolders(req.user.tenantId);
    }

    @Get(':id')
    async findOne(@Request() req, @Param('id') id: string) {
        return this.foldersService.findById(req.user.tenantId, id);
    }

    @Post()
    async create(@Request() req, @Body() dto: CreateFolderDto) {
        return this.foldersService.create(req.user.tenantId, dto);
    }

    @Put(':id')
    async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateFolderDto) {
        return this.foldersService.update(req.user.tenantId, id, dto);
    }

    @Delete(':id')
    async delete(@Request() req, @Param('id') id: string) {
        return this.foldersService.delete(req.user.tenantId, id);
    }

    @Post(':id/archive')
    async archive(@Request() req, @Param('id') id: string) {
        return this.foldersService.archive(req.user.tenantId, id);
    }

    @Post(':id/unarchive')
    async unarchive(@Request() req, @Param('id') id: string) {
        return this.foldersService.unarchive(req.user.tenantId, id);
    }
}
