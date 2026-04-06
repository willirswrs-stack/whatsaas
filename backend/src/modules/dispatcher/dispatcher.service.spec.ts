import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException } from '@nestjs/common';

import { DispatcherService } from './dispatcher.service';
import { Campaign, CampaignContact } from '../campaigns/entities/campaign.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { DISPATCH_QUEUE } from '../../config/bull.config';
import { createMockRepository, MockRepository } from '../../test-utils';

const mockQueue = {
    addBulk: jest.fn().mockResolvedValue([]),
    getJobs: jest.fn().mockResolvedValue([]),
};

const mockCampaignContact = (overrides = {}) => ({
    id: 'cc-123',
    campaignId: 'campaign-123',
    contactId: 'contact-123',
    status: 'queued',
    ...overrides,
});

const mockContact = (overrides = {}) => ({
    id: 'contact-123',
    tenantId: 'tenant-123',
    phone: '5511999999999',
    name: 'Test',
    isValid: true,
    ...overrides,
});

describe('DispatcherService', () => {
    let service: DispatcherService;
    let campaignRepo: MockRepository<Campaign>;
    let campaignContactRepo: MockRepository<CampaignContact>;
    let contactRepo: MockRepository<Contact>;

    beforeEach(async () => {
        campaignRepo = createMockRepository<Campaign>();
        campaignContactRepo = createMockRepository<CampaignContact>();
        contactRepo = createMockRepository<Contact>();

        // Add createQueryBuilder mock
        campaignContactRepo.createQueryBuilder = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([
                { status: 'queued', count: '5' },
                { status: 'sent', count: '10' },
                { status: 'delivered', count: '8' },
            ]),
        });

        mockQueue.addBulk.mockClear();
        mockQueue.getJobs.mockClear();


        // Mock default findOne for validate
        campaignRepo.findOne!.mockResolvedValue({ id: 'campaign-123', tenantId: 'tenant-123' });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DispatcherService,
                { provide: getQueueToken(DISPATCH_QUEUE), useValue: mockQueue },
                { provide: getRepositoryToken(Campaign), useValue: campaignRepo },
                { provide: getRepositoryToken(CampaignContact), useValue: campaignContactRepo },
                { provide: getRepositoryToken(Contact), useValue: contactRepo },
            ],
        }).compile();

        service = module.get<DispatcherService>(DispatcherService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('enqueueCampaign', () => {
        it('should enqueue all pending contacts', async () => {
            const pendingContacts = [
                mockCampaignContact({ id: 'cc-1' }),
                mockCampaignContact({ id: 'cc-2' }),
            ];
            campaignContactRepo.find!.mockResolvedValue(pendingContacts);
            campaignRepo.update!.mockResolvedValue({ affected: 1 });

            const result = await service.enqueueCampaign('campaign-123', 'tenant-123');

            expect(result).toBe(2);
            expect(mockQueue.addBulk).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        data: expect.objectContaining({
                            campaignId: 'campaign-123',
                            tenantId: 'tenant-123',
                        }),
                    }),
                ])
            );
            expect(campaignRepo.update).toHaveBeenCalledWith('campaign-123', {
                status: 'running',
                startedAt: expect.any(Date),
            });
        });

        it('should return 0 if no pending contacts', async () => {
            campaignContactRepo.find!.mockResolvedValue([]);

            const result = await service.enqueueCampaign('campaign-123', 'tenant-123');

            expect(result).toBe(0);
            expect(mockQueue.addBulk).not.toHaveBeenCalled();
        });

        it('should throw ForbiddenException if campaign does not belong to tenant', async () => {
            campaignRepo.findOne!.mockResolvedValue(null);

            await expect(service.enqueueCampaign('campaign-123', 'wrong-tenant'))
                .rejects.toThrow(ForbiddenException);
        });
    });

    describe('prepareCampaignContacts', () => {
        it('should prepare contacts from a list', async () => {
            const contacts = [mockContact({ id: 'c-1' }), mockContact({ id: 'c-2' })];
            contactRepo.findByIds = jest.fn().mockResolvedValue(contacts);
            campaignContactRepo.insert = jest.fn().mockResolvedValue({ identifiers: [] });
            campaignRepo.update!.mockResolvedValue({ affected: 1 });

            const result = await service.prepareCampaignContacts(
                'campaign-123',
                'tenant-123',
                ['c-1', 'c-2']
            );

            expect(result).toBe(2);
            expect(contactRepo.findByIds).toHaveBeenCalledWith(['c-1', 'c-2']);
            expect(campaignRepo.update).toHaveBeenCalledWith('campaign-123', {
                totalContacts: 2,
            });
        });

        it('should find all valid contacts if no list provided', async () => {
            const contacts = [mockContact()];
            contactRepo.find!.mockResolvedValue(contacts);
            campaignContactRepo.insert = jest.fn().mockResolvedValue({ identifiers: [] });
            campaignRepo.update!.mockResolvedValue({ affected: 1 });

            const result = await service.prepareCampaignContacts('campaign-123', 'tenant-123');

            expect(result).toBe(1);
            expect(contactRepo.find).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-123', isValid: true },
            });
        });
    });

    describe('pauseCampaign', () => {
        it('should pause campaign and remove pending jobs', async () => {
            campaignRepo.update!.mockResolvedValue({ affected: 1 });

            const mockJob = {
                data: { campaignId: 'campaign-123' },
                remove: jest.fn().mockResolvedValue(undefined),
            };
            mockQueue.getJobs.mockResolvedValue([mockJob]);

            await service.pauseCampaign('campaign-123');

            expect(campaignRepo.update).toHaveBeenCalledWith('campaign-123', {
                status: 'paused',
            });
            expect(mockQueue.getJobs).toHaveBeenCalledWith(['waiting', 'delayed']);
            expect(mockJob.remove).toHaveBeenCalled();
        });
    });

    describe('resumeCampaign', () => {
        it('should resume campaign and re-enqueue contacts', async () => {
            campaignRepo.update!.mockResolvedValue({ affected: 1 });
            campaignContactRepo.find!.mockResolvedValue([mockCampaignContact()]);

            const result = await service.resumeCampaign('campaign-123', 'tenant-123');

            expect(campaignRepo.update).toHaveBeenCalledWith('campaign-123', {
                status: 'running',
            });
            expect(result).toBe(1);
        });
    });

    describe('getCampaignStats', () => {
        it('should return campaign statistics', async () => {
            const result = await service.getCampaignStats('campaign-123');

            expect(result).toEqual({
                queued: 5,
                sending: 0,
                sent: 10,
                delivered: 8,
                read: 0,
                failed: 0,
            });
        });
    });
});
