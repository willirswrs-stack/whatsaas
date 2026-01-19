import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { FlowFolder } from './entities/flow-folder.entity';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';

@Injectable()
export class FoldersService {
    constructor(
        @InjectRepository(FlowFolder)
        private readonly folderRepository: Repository<FlowFolder>,
    ) { }

    async findAll(tenantId: string, includeArchived = false): Promise<FlowFolder[]> {
        const where: any = { tenantId };
        if (!includeArchived) {
            where.archived = false;
        }
        return this.folderRepository.find({
            where,
            order: { order: 'ASC', createdAt: 'DESC' },
        });
    }

    async findById(tenantId: string, id: string): Promise<FlowFolder> {
        const folder = await this.folderRepository.findOne({
            where: { id, tenantId },
        });
        if (!folder) {
            throw new NotFoundException('Pasta não encontrada');
        }
        return folder;
    }

    async findRootFolders(tenantId: string): Promise<FlowFolder[]> {
        return this.folderRepository.find({
            where: { tenantId, parentId: IsNull(), archived: false },
            order: { order: 'ASC', createdAt: 'DESC' },
        });
    }

    async create(tenantId: string, dto: CreateFolderDto): Promise<FlowFolder> {
        const folder = this.folderRepository.create({
            ...dto,
            tenantId,
        });
        return this.folderRepository.save(folder);
    }

    async update(tenantId: string, id: string, dto: UpdateFolderDto): Promise<FlowFolder> {
        const folder = await this.findById(tenantId, id);
        Object.assign(folder, dto);
        return this.folderRepository.save(folder);
    }

    async delete(tenantId: string, id: string): Promise<{ message: string }> {
        await this.findById(tenantId, id);
        await this.folderRepository.delete({ id, tenantId });
        return { message: 'Pasta excluída com sucesso' };
    }

    async archive(tenantId: string, id: string): Promise<FlowFolder> {
        const folder = await this.findById(tenantId, id);
        folder.archived = true;
        return this.folderRepository.save(folder);
    }

    async unarchive(tenantId: string, id: string): Promise<FlowFolder> {
        const folder = await this.findById(tenantId, id);
        folder.archived = false;
        return this.folderRepository.save(folder);
    }

    async getArchivedFolders(tenantId: string): Promise<FlowFolder[]> {
        return this.folderRepository.find({
            where: { tenantId, archived: true },
            order: { updatedAt: 'DESC' },
        });
    }
}
