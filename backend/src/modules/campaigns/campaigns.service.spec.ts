import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { CampaignsService } from './campaigns.service';
import {
    Campaign,
    CampaignContact,
    MessageVariation,
    Contact,
    Template,
} from './entities/campaign.entity';
import { AiService } from '../ai/ai.service';
import { DispatcherService } from '../dispatcher/dispatcher.service';
import { SettingsService } from '../settings/settings.service';
import { createMockRepository, MockRepository } from '../../test-utils';

// Mock factories
const mockCampaign = (overrides = {}) => ({
    id: 'campaign-123',
    tenantId: 'tenant-123',
    name: 'Test Campaign',
    templateId: 'template-123',
    template: {
        id: 'template-123',
        name: 'Test Template',
        content: 'Hello {{name}}!',
    },
    instanceId: null,
    status: 'draft',
    aiSpinEnabled: true,
    variationCount: 5,
    scheduleConfig: {},
    targetingRules: {},
    minDelayMs: 5000,
    maxDelayMs: 15000,
    totalContacts: 10,
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    variations: [],
    campaignContacts: [],
    ...overrides,
});

const mockContact = (overrides = {}) => ({
    id: 'contact-123',
    tenantId: 'tenant-123',
    phone: '5511999999999',
    name: 'John Doe',
    customFields: {},
    isValid: true,
    onWhatsapp: true,
    lastInteraction: null,
    createdAt: new Date(),
    ...overrides,
});

const mockTemplate = (overrides = {}) => ({
    id: 'template-123',
    tenantId: 'tenant-123',
    name: 'Test Template',
    content: 'Hello {{name}}!',
    contentType: 'text',
    mediaConfig: {},
    variables: ['name'],
    createdAt: new Date(),
    ...overrides,
});

describe('CampaignsService', () => {
    let service: CampaignsService;
    let campaignRepo: MockRepository<Campaign>;
    let campaignContactRepo: MockRepository<CampaignContact>;
    let variationRepo: MockRepository<MessageVariation>;
    let contactRepo: MockRepository<Contact>;
    let templateRepo: MockRepository<Template>;
    let aiService: jest.Mocked<Partial<AiService>>;
    let dispatcherService: jest.Mocked<Partial<DispatcherService>>;
    let settingsService: jest.Mocked<Partial<SettingsService>>;

    beforeEach(async () => {
        campaignRepo = createMockRepository<Campaign>();
        campaignContactRepo = createMockRepository<CampaignContact>();
        variationRepo = createMockRepository<MessageVariation>();
        contactRepo = createMockRepository<Contact>();
        templateRepo = createMockRepository<Template>();

        aiService = {
            generateVariations: jest.fn().mockResolvedValue({
                variations: ['Variation 1', 'Variation 2'],
                tokensUsed: 100,
            }),
            generateVariationsWithKey: jest.fn().mockResolvedValue({
                variations: ['AI Variation 1'],
                tokensUsed: 50,
            }),
        };

        dispatcherService = {
            enqueueCampaign: jest.fn().mockResolvedValue(10),
            pauseCampaign: jest.fn().mockResolvedValue(undefined),
            resumeCampaign: jest.fn().mockResolvedValue(5),
            getCampaignStats: jest.fn().mockResolvedValue({
                total: 10,
                sent: 5,
                delivered: 3,
                failed: 0,
            }),
        };

        settingsService = {
            getOpenAIKey: jest.fn().mockResolvedValue('sk-test-key'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CampaignsService,
                { provide: getRepositoryToken(Campaign), useValue: campaignRepo },
                { provide: getRepositoryToken(CampaignContact), useValue: campaignContactRepo },
                { provide: getRepositoryToken(MessageVariation), useValue: variationRepo },
                { provide: getRepositoryToken(Contact), useValue: contactRepo },
                { provide: getRepositoryToken(Template), useValue: templateRepo },
                { provide: AiService, useValue: aiService },
                { provide: DispatcherService, useValue: dispatcherService },
                { provide: SettingsService, useValue: settingsService },
            ],
        }).compile();

        service = module.get<CampaignsService>(CampaignsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all campaigns for a tenant', async () => {
            const campaigns = [mockCampaign(), mockCampaign({ id: 'campaign-456' })];
            campaignRepo.find!.mockResolvedValue(campaigns);

            const result = await service.findAll('tenant-123');

            expect(result).toHaveLength(2);
            expect(campaignRepo.find).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-123' },
                relations: ['template'],
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('findOne', () => {
        it('should return a campaign by id', async () => {
            const campaign = mockCampaign();
            campaignRepo.findOne!.mockResolvedValue(campaign);

            const result = await service.findOne('campaign-123', 'tenant-123');

            expect(result).toEqual(campaign);
        });

        it('should throw NotFoundException if not found', async () => {
            campaignRepo.findOne!.mockResolvedValue(null);

            await expect(service.findOne('non-existent', 'tenant-123'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        it('should create a campaign with contacts', async () => {
            const createData = {
                name: 'New Campaign',
                contactIds: ['contact-1', 'contact-2'],
                minDelaySec: 5,
                maxDelaySec: 15,
            };

            campaignRepo.create!.mockImplementation((data) => ({ ...mockCampaign(), ...data }));
            campaignRepo.save!.mockImplementation((data) => Promise.resolve(data));
            campaignContactRepo.create!.mockImplementation((data) => data);
            campaignContactRepo.save!.mockResolvedValue([]);

            const result = await service.create('tenant-123', createData);

            expect(result.name).toBe('New Campaign');
            expect(campaignContactRepo.save).toHaveBeenCalled();
        });

        it('should set correct delay in milliseconds', async () => {
            campaignRepo.create!.mockImplementation((data) => ({ ...mockCampaign(), ...data }));
            campaignRepo.save!.mockImplementation((data) => Promise.resolve(data));

            await service.create('tenant-123', {
                name: 'Test',
                minDelaySec: 10,
                maxDelaySec: 30,
            });

            expect(campaignRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    minDelayMs: 10000,
                    maxDelayMs: 30000,
                })
            );
        });
    });

    describe('generateVariations', () => {
        it('should generate variations using AI', async () => {
            const campaign = mockCampaign({ template: mockTemplate() });
            campaignRepo.findOne!.mockResolvedValue(campaign);
            variationRepo.save!.mockResolvedValue([]);
            campaignRepo.update!.mockResolvedValue({ affected: 1 });

            const result = await service.generateVariations('campaign-123', 'tenant-123', {
                count: 5,
                creativity: 0.8,
                provider: 'openai',
            });

            expect(aiService.generateVariations).toHaveBeenCalledWith(
                'Hello {{name}}!',
                5,
                0.8,
                'openai'
            );
            expect(result.tokensUsed).toBe(100);
        });

        it('should throw if campaign has no template', async () => {
            const campaign = mockCampaign({ template: null });
            campaignRepo.findOne!.mockResolvedValue(campaign);

            await expect(
                service.generateVariations('campaign-123', 'tenant-123', { count: 5 })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('start', () => {
        it('should start a campaign with contacts', async () => {
            const campaign = mockCampaign({ variations: [] });
            campaignRepo.findOne!.mockResolvedValue(campaign);
            campaignContactRepo.count!.mockResolvedValue(10);
            variationRepo.create!.mockImplementation((data) => data);
            variationRepo.save!.mockResolvedValue([]);
            campaignRepo.update!.mockResolvedValue({ affected: 1 });

            await service.start('campaign-123', 'tenant-123');

            expect(campaignRepo.update).toHaveBeenCalledWith('campaign-123', {
                status: 'running',
                startedAt: expect.any(Date),
            });
            expect(dispatcherService.enqueueCampaign).toHaveBeenCalledWith('campaign-123', 'tenant-123');
        });

        it('should throw if campaign has no contacts', async () => {
            const campaign = mockCampaign();
            campaignRepo.findOne!.mockResolvedValue(campaign);
            campaignContactRepo.count!.mockResolvedValue(0);

            await expect(service.start('campaign-123', 'tenant-123'))
                .rejects.toThrow(/não tem contatos/);
        });
    });

    describe('pause', () => {
        it('should pause a campaign', async () => {
            const campaign = mockCampaign({ status: 'running' });
            campaignRepo.findOne!.mockResolvedValue(campaign);

            await service.pause('campaign-123', 'tenant-123');

            expect(dispatcherService.pauseCampaign).toHaveBeenCalledWith('campaign-123');
        });
    });

    describe('resume', () => {
        it('should resume a paused campaign', async () => {
            const campaign = mockCampaign({ status: 'paused' });
            campaignRepo.findOne!.mockResolvedValue(campaign);

            const result = await service.resume('campaign-123', 'tenant-123');

            expect(dispatcherService.resumeCampaign).toHaveBeenCalledWith('campaign-123', 'tenant-123');
            expect(result.queuedMessages).toBe(5);
        });
    });

    describe('getStats', () => {
        it('should return campaign stats', async () => {
            const campaign = mockCampaign();
            campaignRepo.findOne!.mockResolvedValue(campaign);

            const result = await service.getStats('campaign-123', 'tenant-123');

            expect(result).toEqual({
                total: 10,
                sent: 5,
                delivered: 3,
                failed: 0,
            });
        });
    });

    describe('cancel', () => {
        it('should cancel a campaign', async () => {
            const campaign = mockCampaign({ status: 'running' });
            campaignRepo.findOne!.mockResolvedValue(campaign);
            campaignRepo.update!.mockResolvedValue({ affected: 1 });

            await service.cancel('campaign-123', 'tenant-123');

            expect(campaignRepo.update).toHaveBeenCalledWith('campaign-123', { status: 'cancelled' });
            expect(dispatcherService.pauseCampaign).toHaveBeenCalledWith('campaign-123');
        });
    });

    describe('delete', () => {
        it('should delete campaign and related records', async () => {
            const campaign = mockCampaign();
            campaignRepo.findOne!.mockResolvedValue(campaign);
            campaignContactRepo.delete!.mockResolvedValue({ affected: 10 });
            variationRepo.delete!.mockResolvedValue({ affected: 5 });
            campaignRepo.remove!.mockResolvedValue(campaign);

            const result = await service.delete('campaign-123', 'tenant-123');

            expect(result).toEqual({ deleted: true });
            expect(campaignContactRepo.delete).toHaveBeenCalledWith({ campaignId: 'campaign-123' });
            expect(variationRepo.delete).toHaveBeenCalledWith({ campaignId: 'campaign-123' });
        });
    });

    describe('Templates', () => {
        describe('findAllTemplates', () => {
            it('should return all templates', async () => {
                const templates = [mockTemplate()];
                templateRepo.find!.mockResolvedValue(templates);

                const result = await service.findAllTemplates('tenant-123');

                expect(result).toHaveLength(1);
            });
        });

        describe('createTemplate', () => {
            it('should create a new template', async () => {
                templateRepo.create!.mockImplementation((data) => ({ ...mockTemplate(), ...data }));
                templateRepo.save!.mockImplementation((data) => Promise.resolve(data));

                const result = await service.createTemplate('tenant-123', {
                    name: 'New Template',
                    content: 'Hello!',
                });

                expect(result.name).toBe('New Template');
            });
        });
    });

    describe('Contacts', () => {
        describe('findAllContacts', () => {
            it('should return all contacts', async () => {
                const contacts = [mockContact()];
                contactRepo.find!.mockResolvedValue(contacts);

                const result = await service.findAllContacts('tenant-123');

                expect(result).toHaveLength(1);
            });
        });

        describe('createContact', () => {
            it('should create a new contact', async () => {
                contactRepo.create!.mockImplementation((data) => ({ ...mockContact(), ...data }));
                contactRepo.save!.mockImplementation((data) => Promise.resolve(data));

                const result = await service.createContact('tenant-123', {
                    phone: '5511888888888',
                    name: 'Jane Doe',
                });

                expect(result.phone).toBe('5511888888888');
            });
        });

        describe('importContacts', () => {
            it('should import multiple contacts', async () => {
                const contactsToImport = [
                    { phone: '5511111111111', name: 'Contact 1' },
                    { phone: '5511222222222', name: 'Contact 2' },
                ];

                contactRepo.create!.mockImplementation((data) => ({ ...mockContact(), ...data }));
                contactRepo.save!.mockImplementation((data) => Promise.resolve(data));

                const result = await service.importContacts('tenant-123', contactsToImport);

                expect(contactRepo.create).toHaveBeenCalledTimes(2);
                expect(contactRepo.save).toHaveBeenCalled();
            });
        });
    });
});
