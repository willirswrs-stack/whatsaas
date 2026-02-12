import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { FoldersService } from './folders.service';
import { FlowFolder } from './entities/flow-folder.entity';
import { createMockRepository, MockRepository } from '../../test-utils';

const mockFolder = (overrides = {}) => ({
    id: 'folder-123',
    tenantId: 'tenant-123',
    name: 'Test Folder',
    color: '#3B82F6',
    icon: 'folder',
    parentId: null,
    order: 0,
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('FoldersService', () => {
    let service: FoldersService;
    let folderRepo: MockRepository<FlowFolder>;

    beforeEach(async () => {
        folderRepo = createMockRepository<FlowFolder>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FoldersService,
                { provide: getRepositoryToken(FlowFolder), useValue: folderRepo },
            ],
        }).compile();

        service = module.get<FoldersService>(FoldersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all non-archived folders', async () => {
            const folders = [mockFolder(), mockFolder({ id: 'folder-456' })];
            folderRepo.find!.mockResolvedValue(folders);

            const result = await service.findAll('tenant-123');

            expect(result).toHaveLength(2);
            expect(folderRepo.find).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-123', archived: false },
                order: { order: 'ASC', createdAt: 'DESC' },
            });
        });

        it('should include archived folders when requested', async () => {
            folderRepo.find!.mockResolvedValue([]);

            await service.findAll('tenant-123', true);

            expect(folderRepo.find).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-123' },
                order: { order: 'ASC', createdAt: 'DESC' },
            });
        });
    });

    describe('findById', () => {
        it('should return folder by id', async () => {
            const folder = mockFolder();
            folderRepo.findOne!.mockResolvedValue(folder);

            const result = await service.findById('tenant-123', 'folder-123');

            expect(result).toEqual(folder);
        });

        it('should throw NotFoundException if not found', async () => {
            folderRepo.findOne!.mockResolvedValue(null);

            await expect(service.findById('tenant-123', 'non-existent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('findRootFolders', () => {
        it('should return folders without parent', async () => {
            const folders = [mockFolder({ parentId: null })];
            folderRepo.find!.mockResolvedValue(folders);

            const result = await service.findRootFolders('tenant-123');

            expect(result).toHaveLength(1);
        });
    });

    describe('create', () => {
        it('should create a new folder', async () => {
            folderRepo.create!.mockImplementation((data) => ({ ...mockFolder(), ...data }));
            folderRepo.save!.mockImplementation((data) => Promise.resolve(data));

            const result = await service.create('tenant-123', {
                name: 'New Folder',
            });

            expect(result.name).toBe('New Folder');
            expect(result.tenantId).toBe('tenant-123');
        });
    });

    describe('update', () => {
        it('should update an existing folder', async () => {
            const folder = mockFolder();
            folderRepo.findOne!.mockResolvedValue(folder);
            folderRepo.save!.mockImplementation((data) => Promise.resolve(data));

            const result = await service.update('tenant-123', 'folder-123', {
                name: 'Updated Folder',
            });

            expect(result.name).toBe('Updated Folder');
        });
    });

    describe('delete', () => {
        it('should delete a folder', async () => {
            const folder = mockFolder();
            folderRepo.findOne!.mockResolvedValue(folder);
            folderRepo.delete!.mockResolvedValue({ affected: 1 });

            const result = await service.delete('tenant-123', 'folder-123');

            expect(result.message).toBe('Pasta excluída com sucesso');
        });
    });

    describe('archive', () => {
        it('should archive a folder', async () => {
            const folder = mockFolder({ archived: false });
            folderRepo.findOne!.mockResolvedValue(folder);
            folderRepo.save!.mockImplementation((data) => Promise.resolve(data));

            const result = await service.archive('tenant-123', 'folder-123');

            expect(result.archived).toBe(true);
        });
    });

    describe('unarchive', () => {
        it('should unarchive a folder', async () => {
            const folder = mockFolder({ archived: true });
            folderRepo.findOne!.mockResolvedValue(folder);
            folderRepo.save!.mockImplementation((data) => Promise.resolve(data));

            const result = await service.unarchive('tenant-123', 'folder-123');

            expect(result.archived).toBe(false);
        });
    });

    describe('getArchivedFolders', () => {
        it('should return only archived folders', async () => {
            const archivedFolders = [mockFolder({ archived: true })];
            folderRepo.find!.mockResolvedValue(archivedFolders);

            const result = await service.getArchivedFolders('tenant-123');

            expect(result).toHaveLength(1);
            expect(folderRepo.find).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-123', archived: true },
                order: { updatedAt: 'DESC' },
            });
        });
    });
});
