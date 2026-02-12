
import { Test, TestingModule } from '@nestjs/testing';
import { DispatcherProcessor } from './dispatcher.processor';
import { Job } from 'bullmq';
import { Instance } from '../instances/entities/instance.entity';
import { Campaign, CampaignContact, MessageVariation } from '../campaigns/entities/campaign.entity';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { HumanBehaviorService } from '../anti-ban/human-behavior.service';
import { PatternBreakerService } from '../anti-ban/pattern-breaker.service';
import { DelayGeneratorService } from '../anti-ban/delay-generator.service';
import { StackRouterService } from '../anti-ban/stack-router.service';
import { AntiBanAnalyticsService } from '../anti-ban/analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FlowsService } from '../flows/flows.service';
import { EventsGateway } from '../events/events.gateway';
import { Logger } from '@nestjs/common';

describe('DispatcherProcessor', () => {
    let processor: DispatcherProcessor;
    let mockWhatsAppFactory: any;

    const mockJob = {
        id: '1',
        data: {
            tenantId: 'tenant-123',
            campaignContactId: 'cc-123',
            campaignId: 'camp-123',
        },
        token: 'token-123',
        moveToDelayed: jest.fn(),
    } as unknown as Job;

    beforeEach(async () => {
        // Mock repositories
        const mockRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            increment: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn(() => ({
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                execute: jest.fn(),
            })),
        };

        // Mock WhatsApp Provider
        const mockProvider = {
            sendText: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
            sendPresence: jest.fn().mockResolvedValue(true),
        };

        mockWhatsAppFactory = {
            getProvider: jest.fn().mockReturnValue(mockProvider),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DispatcherProcessor,
                { provide: getRepositoryToken(Instance), useValue: mockRepo },
                { provide: getRepositoryToken(CampaignContact), useValue: mockRepo },
                { provide: getRepositoryToken(MessageVariation), useValue: mockRepo },
                { provide: getRepositoryToken(Campaign), useValue: mockRepo },
                { provide: WhatsAppProviderFactory, useValue: mockWhatsAppFactory },
                // Mock Anti-Ban Services
                {
                    provide: HumanBehaviorService,
                    useValue: {
                        isWithinActiveHours: jest.fn().mockReturnValue(true),
                        simulateHumanBehavior: jest.fn().mockResolvedValue({
                            typingDurationMs: 100,
                            delayBeforeSendMs: 100,
                            totalWaitMs: 200,
                        }),
                    },
                },
                {
                    provide: PatternBreakerService,
                    useValue: {
                        breakPattern: jest.fn().mockReturnValue({
                            content: 'Olá Teste',
                            contentHash: 'hash-123',
                            transformationsApplied: [],
                        }),
                    },
                },
                {
                    provide: DelayGeneratorService,
                    useValue: {
                        calculateWarmupDelay: jest.fn().mockReturnValue({ minSeconds: 1, maxSeconds: 2 }),
                    },
                },
                {
                    provide: StackRouterService,
                    useValue: {
                        route: jest.fn().mockReturnValue({
                            selectedStack: 'waha',
                            confidence: 100,
                            reason: 'Test',
                        }),
                    },
                },
                {
                    provide: AntiBanAnalyticsService,
                    useValue: {
                        recordSent: jest.fn(),
                        recordFailed: jest.fn(),
                    },
                },
                {
                    provide: FlowsService,
                    useValue: {
                        startExecution: jest.fn(),
                    },
                },
                {
                    provide: EventsGateway,
                    useValue: {
                        emitToTenant: jest.fn(),
                    },
                },
            ],
        }).compile();

        processor = module.get<DispatcherProcessor>(DispatcherProcessor);

        // Setup mock data return values
        mockRepo.findOne.mockImplementation(({ where }) => {
            if (where.id === 'cc-123') {
                return Promise.resolve({
                    id: 'cc-123',
                    contact: { id: 'contact-1', phone: '5511999999999', name: 'Teste' },
                    campaign: {
                        id: 'camp-1',
                        settings: { activeHoursStart: '00:00', activeHoursEnd: '23:59' },
                        instanceId: 'inst-1',
                    },
                });
            }
            if (where.id === 'inst-1') {
                return Promise.resolve({
                    id: 'inst-1',
                    instanceName: 'test-instance',
                    status: 'connected',
                    dailySent: 0,
                    dailyLimit: 1000,
                    provider: 'waha',
                    warmupEnabled: false,
                });
            }
            return Promise.resolve(null);
        });

        // Mock find for variations
        mockRepo.find.mockResolvedValue([
            { id: 'var-1', content: 'Olá {name}', useCount: 0 }
        ]);
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    it('should process a dispatch job successfully', async () => {
        const result = await processor.process(mockJob);

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('msg-123');
        expect(mockWhatsAppFactory.getProvider).toHaveBeenCalledWith('waha');
    });
});
