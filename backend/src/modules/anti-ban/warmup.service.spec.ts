import { Test, TestingModule } from '@nestjs/testing';
import { WarmupService, WARMUP_SCHEDULE, MATURE_LIMIT } from './warmup.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Instance } from '../instances/entities/instance.entity';
import { WARMUP_QUEUE } from '../../config/bull.config';

// Mock Repository
const mockInstanceRepo = {
    find: jest.fn(),
    update: jest.fn(),
};

// Mock Queue
const mockQueue = {
    add: jest.fn(),
    getRepeatableJobs: jest.fn().mockResolvedValue([]),
    removeRepeatableByKey: jest.fn(),
};

describe('WarmupService', () => {
    let service: WarmupService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WarmupService,
                {
                    provide: getRepositoryToken(Instance),
                    useValue: mockInstanceRepo,
                },
                {
                    provide: `BullQueue_${WARMUP_QUEUE}`,
                    useValue: mockQueue,
                },
            ],
        }).compile();

        service = module.get<WarmupService>(WarmupService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // =========================================================================
    // WARMUP ADVANCEMENT
    // =========================================================================

    describe('advanceInstanceWarmup', () => {
        it('should advance to next day if schedule exists', async () => {
            const instance = {
                id: 'inst-1',
                instanceName: 'test',
                status: 'connected',
                warmupEnabled: true,
                warmupDay: 1, // Currently on Day 1
            } as Instance;

            // Run
            const result = await service.advanceInstanceWarmup(instance);

            // Expect
            expect(result).toBe('advanced');
            expect(mockInstanceRepo.update).toHaveBeenCalledWith(
                'inst-1',
                expect.objectContaining({
                    warmupDay: 2, // Should advance to Day 2
                    dailyLimit: WARMUP_SCHEDULE.find(s => s.day === 2)?.limit,
                })
            );
        });

        it('should graduate instance if end of schedule reached', async () => {
            const lastDay = WARMUP_SCHEDULE[WARMUP_SCHEDULE.length - 1].day;
            const instance = {
                id: 'inst-ready',
                instanceName: 'test',
                status: 'connected',
                warmupEnabled: true,
                warmupDay: lastDay, // On last day
            } as Instance;

            // Run
            const result = await service.advanceInstanceWarmup(instance);

            // Expect
            expect(result).toBe('completed');
            expect(mockInstanceRepo.update).toHaveBeenCalledWith(
                'inst-ready',
                expect.objectContaining({
                    warmupEnabled: false,
                    warmupDay: lastDay + 1,
                    dailyLimit: MATURE_LIMIT,
                })
            );
        });

        it('should NOT advance if instance is disconnected', async () => {
            const instance = {
                id: 'inst-down',
                instanceName: 'test',
                status: 'disconnected',
                warmupEnabled: true,
                warmupDay: 5,
            } as Instance;

            // Run
            const result = await service.advanceInstanceWarmup(instance);

            // Expect
            expect(result).toBe('no-change');
            expect(mockInstanceRepo.update).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // ROUTINE EXECUTION
    // =========================================================================

    describe('executeDailyWarmupRoutine', () => {
        it('should process all eligible instances', async () => {
            // Setup mock to return 2 instances
            mockInstanceRepo.find.mockResolvedValue([
                { id: '1', status: 'connected', warmupDay: 1 },
                { id: '2', status: 'connected', warmupDay: 5 },
            ]);

            // Run
            const result = await service.executeDailyWarmupRoutine();

            // Expect
            expect(result.advanced).toBe(2);
            expect(mockInstanceRepo.update).toHaveBeenCalledTimes(2);
        });
    });

    // =========================================================================
    // SCHEDULING
    // =========================================================================

    describe('scheduleDailyJob', () => {
        it('should add repeatable job to queue', async () => {
            await service.scheduleDailyJob();

            expect(mockQueue.add).toHaveBeenCalledWith(
                'daily-warmup-routine',
                {},
                expect.objectContaining({
                    repeat: expect.objectContaining({
                        pattern: '0 4 * * *',
                    }),
                })
            );
        });
    });
});
