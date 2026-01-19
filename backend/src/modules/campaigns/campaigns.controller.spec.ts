import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

const mockCampaign = {
    id: 'campaign-123',
    tenantId: 'tenant-123',
    name: 'Test Campaign',
    status: 'draft',
};

describe('CampaignsController', () => {
    let controller: CampaignsController;
    let campaignsService: jest.Mocked<Partial<CampaignsService>>;

    beforeEach(async () => {
        campaignsService = {
            findAll: jest.fn().mockResolvedValue([mockCampaign]),
            findOne: jest.fn().mockResolvedValue(mockCampaign),
            create: jest.fn().mockResolvedValue(mockCampaign),
            generateVariations: jest.fn().mockResolvedValue({ variations: [], tokensUsed: 100 }),
            start: jest.fn().mockResolvedValue({ ...mockCampaign, status: 'running' }),
            pause: jest.fn().mockResolvedValue({ ...mockCampaign, status: 'paused' }),
            resume: jest.fn().mockResolvedValue({ campaign: mockCampaign, queuedMessages: 5 }),
            cancel: jest.fn().mockResolvedValue({ ...mockCampaign, status: 'cancelled' }),
            delete: jest.fn().mockResolvedValue({ deleted: true }),
            getStats: jest.fn().mockResolvedValue({ total: 10, sent: 5, delivered: 3, failed: 0 }),
            findAllTemplates: jest.fn().mockResolvedValue([{ id: 'template-123', name: 'Test' }]),
            createTemplate: jest.fn().mockResolvedValue({ id: 'template-123', name: 'New Template' }),
            findAllContacts: jest.fn().mockResolvedValue([{ id: 'contact-123', phone: '5511999999999' }]),
            createContact: jest.fn().mockResolvedValue({ id: 'contact-123', phone: '5511999999999' }),
            importContacts: jest.fn().mockResolvedValue([{ id: 'contact-123' }]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [CampaignsController],
            providers: [
                { provide: CampaignsService, useValue: campaignsService },
            ],
        }).compile();

        controller = module.get<CampaignsController>(CampaignsController);
    });

    describe('findAll', () => {
        it('should return all campaigns', async () => {
            const result = await controller.findAll('tenant-123');
            expect(result).toHaveLength(1);
        });
    });

    describe('findOne', () => {
        it('should return a campaign by id', async () => {
            const result = await controller.findOne('campaign-123', 'tenant-123');
            expect(result.id).toBe('campaign-123');
        });
    });

    describe('create', () => {
        it('should create a new campaign', async () => {
            const data = { name: 'New Campaign' };
            const result = await controller.create(data, 'tenant-123');
            expect(result.name).toBe('Test Campaign');
            expect(campaignsService.create).toHaveBeenCalledWith('tenant-123', data);
        });
    });

    describe('generateVariations', () => {
        it('should generate AI variations', async () => {
            const options = { count: 5, creativity: 0.7 };
            const result = await controller.generateVariations('campaign-123', options, 'tenant-123');
            expect(result.tokensUsed).toBe(100);
        });
    });

    describe('start', () => {
        it('should start a campaign', async () => {
            const result = await controller.start('campaign-123', 'tenant-123');
            expect(result.status).toBe('running');
        });
    });

    describe('pause', () => {
        it('should pause a campaign', async () => {
            const result = await controller.pause('campaign-123', 'tenant-123');
            expect(result.status).toBe('paused');
        });
    });

    describe('resume', () => {
        it('should resume a campaign', async () => {
            const result = await controller.resume('campaign-123', 'tenant-123');
            expect(result.queuedMessages).toBe(5);
        });
    });

    describe('cancel', () => {
        it('should cancel a campaign', async () => {
            const result = await controller.cancel('campaign-123', 'tenant-123');
            expect(result.status).toBe('cancelled');
        });
    });

    describe('delete', () => {
        it('should delete a campaign', async () => {
            const result = await controller.delete('campaign-123', 'tenant-123');
            expect(result.deleted).toBe(true);
        });
    });

    describe('getStats', () => {
        it('should return campaign stats', async () => {
            const result = await controller.getStats('campaign-123', 'tenant-123');
            expect(result.total).toBe(10);
        });
    });

    describe('Templates', () => {
        it('should list all templates', async () => {
            const result = await controller.findAllTemplates('tenant-123');
            expect(result).toHaveLength(1);
        });

        it('should create a template', async () => {
            const data = { name: 'New Template', content: 'Hello!' };
            const result = await controller.createTemplate(data, 'tenant-123');
            expect(result.name).toBe('New Template');
        });
    });

    describe('Contacts', () => {
        it('should list all contacts', async () => {
            const result = await controller.findAllContacts('tenant-123');
            expect(result).toHaveLength(1);
        });

        it('should create a contact', async () => {
            const data = { phone: '5511888888888', name: 'John' };
            const result = await controller.createContact(data, 'tenant-123');
            expect(result.phone).toBe('5511999999999');
        });
    });

    describe('importContacts', () => {
        it('should import contacts from CSV', async () => {
            const csvContent = 'telefone,nome\n5511999999999,John\n5511888888888,Jane';
            const file = {
                buffer: Buffer.from(csvContent),
                originalname: 'contacts.csv',
                mimetype: 'text/csv',
                size: csvContent.length,
            };

            const result = await controller.importContacts(file, 'tenant-123');

            expect(result.imported).toBe(1);
            expect(result.total).toBe(2);
        });

        it('should throw error if no file uploaded', async () => {
            await expect(controller.importContacts(null as any, 'tenant-123'))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw error if CSV has no phone column', async () => {
            const csvContent = 'nome,email\nJohn,john@test.com';
            const file = {
                buffer: Buffer.from(csvContent),
                originalname: 'contacts.csv',
                mimetype: 'text/csv',
                size: csvContent.length,
            };

            await expect(controller.importContacts(file, 'tenant-123'))
                .rejects.toThrow(/telefone/);
        });

        it('should throw error if CSV has less than 2 rows', async () => {
            const csvContent = 'telefone,nome';
            const file = {
                buffer: Buffer.from(csvContent),
                originalname: 'contacts.csv',
                mimetype: 'text/csv',
                size: csvContent.length,
            };

            await expect(controller.importContacts(file, 'tenant-123'))
                .rejects.toThrow(/header and one data row/);
        });
    });
});
