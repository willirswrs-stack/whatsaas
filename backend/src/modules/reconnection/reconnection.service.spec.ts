
import { Test, TestingModule } from '@nestjs/testing';
import { ReconnectionService } from './reconnection.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Instance } from '../instances/entities/instance.entity';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { ConfigService } from '@nestjs/config';

describe('ReconnectionService', () => {
    let service: ReconnectionService;

    const mockRepo = {
        createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        })),
        find: jest.fn(),
        update: jest.fn(),
        findOne: jest.fn(),
    };

    const mockProviderFactory = {
        getProvider: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReconnectionService,
                { provide: getRepositoryToken(Instance), useValue: mockRepo },
                { provide: WhatsAppProviderFactory, useValue: mockProviderFactory },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<ReconnectionService>(ReconnectionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('findEligibleInstances should call query builder correctly', async () => {
        await service.findEligibleInstances(10);
        expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('instance');
    });
});
