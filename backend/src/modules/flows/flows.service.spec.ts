import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FlowsService } from './flows.service';
import { Flow, FlowExecution, FlowTrigger } from './entities';
import { createMockRepository, MockRepository } from '../../test-utils';
import { InstancesService } from '../instances/instances.service';
import { ContactsService } from '../contacts/contacts.service';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { AiService } from '../ai/ai.service';

const mockFlow = (overrides = {}) => ({
    id: 'flow-123',
    tenantId: 'tenant-123',
    name: 'Test Flow',
    description: 'Test Description',
    channel: 'whatsapp',
    nodes: [
        {
            id: 'start-1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: { label: 'Início', type: 'start', config: {} },
        },
    ],
    edges: [],
    status: 'draft',
    executionCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const mockTrigger = (overrides = {}) => ({
    id: 'trigger-123',
    flowId: 'flow-123',
    tenantId: 'tenant-123',
    type: 'message',
    config: {},
    active: true,
    ...overrides,
});

const mockExecution = (overrides = {}) => ({
    id: 'exec-123',
    flowId: 'flow-123',
    contactId: 'contact-123',
    instanceId: 'instance-123',
    status: 'running',
    currentNodeId: 'start-1',
    variables: {},
    logs: [],
    startedAt: new Date(),
    ...overrides,
});

describe('FlowsService', () => {
    let service: FlowsService;
    let flowRepo: MockRepository<Flow>;
    let executionRepo: MockRepository<FlowExecution>;
    let triggerRepo: MockRepository<FlowTrigger>;

    const mockInstancesService = {
        findById: jest.fn(),
    };

    const mockContactsService = {
        findById: jest.fn(),
    };

    const mockProvider = {
        sendText: jest.fn(),
        sendMedia: jest.fn(),
    };

    const mockWhatsAppFactory = {
        getProvider: jest.fn().mockReturnValue(mockProvider),
    };

    const mockAiService = {
        generateResponseWithKey: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        flowRepo = createMockRepository<Flow>();
        executionRepo = createMockRepository<FlowExecution>();
        triggerRepo = createMockRepository<FlowTrigger>();

        // Mock createQueryBuilder for executions
        executionRepo.createQueryBuilder = jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([mockExecution()]),
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FlowsService,
                { provide: getRepositoryToken(Flow), useValue: flowRepo },
                { provide: getRepositoryToken(FlowExecution), useValue: executionRepo },
                { provide: getRepositoryToken(FlowTrigger), useValue: triggerRepo },
                { provide: InstancesService, useValue: mockInstancesService },
                { provide: ContactsService, useValue: mockContactsService },
                { provide: WhatsAppProviderFactory, useValue: mockWhatsAppFactory },
                { provide: AiService, useValue: mockAiService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<FlowsService>(FlowsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all flows for a tenant', async () => {
            const flows = [mockFlow(), mockFlow({ id: 'flow-456' })];
            flowRepo.find!.mockResolvedValue(flows);

            const result = await service.findAll('tenant-123');

            expect(result).toHaveLength(2);
        });
    });

    describe('findById', () => {
        it('should return flow with triggers', async () => {
            const flow = mockFlow();
            flowRepo.findOne!.mockResolvedValue(flow);
            triggerRepo.find!.mockResolvedValue([mockTrigger()]);

            const result = await service.findById('tenant-123', 'flow-123');

            expect(result.triggers).toHaveLength(1);
        });

        it('should throw NotFoundException if not found', async () => {
            flowRepo.findOne!.mockResolvedValue(null);

            await expect(service.findById('tenant-123', 'non-existent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        it('should create flow with default start node', async () => {
            flowRepo.create!.mockImplementation((data) => ({ ...mockFlow(), ...data }));
            flowRepo.save!.mockImplementation((data) => Promise.resolve(data));

            const result = await service.create('tenant-123', {
                name: 'New Flow',
                channel: 'whatsapp',
            });

            expect(result.name).toBe('New Flow');
            expect(result.nodes).toBeDefined();
        });
    });

    describe('update', () => {
        it('should update an existing flow', async () => {
            const flow = mockFlow();
            flowRepo.findOne!.mockResolvedValue(flow);
            triggerRepo.find!.mockResolvedValue([]);
            flowRepo.update!.mockResolvedValue({ affected: 1 });

            const result = await service.update('tenant-123', 'flow-123', {
                name: 'Updated Flow',
            });

            expect(flowRepo.update).toHaveBeenCalledWith('flow-123', { name: 'Updated Flow' });
        });
    });

    describe('delete', () => {
        it('should delete flow and related records', async () => {
            const flow = mockFlow();
            flowRepo.findOne!.mockResolvedValue(flow);
            triggerRepo.find!.mockResolvedValue([]);
            triggerRepo.delete!.mockResolvedValue({ affected: 1 });
            executionRepo.delete!.mockResolvedValue({ affected: 0 });
            flowRepo.delete!.mockResolvedValue({ affected: 1 });

            const result = await service.delete('tenant-123', 'flow-123');

            expect(result.message).toBe('Fluxo excluído com sucesso');
        });
    });

    describe('duplicate', () => {
        it('should create a copy of the flow', async () => {
            const flow = mockFlow();
            flowRepo.findOne!.mockResolvedValue(flow);
            triggerRepo.find!.mockResolvedValue([]);
            flowRepo.create!.mockImplementation((data) => ({ ...mockFlow(), ...data }));
            flowRepo.save!.mockImplementation((data) => Promise.resolve(data));

            const result = await service.duplicate('tenant-123', 'flow-123');

            expect(result.name).toContain('(Cópia)');
            expect(result.status).toBe('draft');
        });
    });

    describe('activate', () => {
        it('should activate a flow', async () => {
            const flow = mockFlow();
            flowRepo.findOne!.mockResolvedValue(flow);
            triggerRepo.find!.mockResolvedValue([]);
            flowRepo.update!.mockResolvedValue({ affected: 1 });

            await service.activate('tenant-123', 'flow-123');

            expect(flowRepo.update).toHaveBeenCalledWith('flow-123', { status: 'active' });
        });

        it('should throw if flow has no nodes', async () => {
            const flow = mockFlow({ nodes: [] });
            flowRepo.findOne!.mockResolvedValue(flow);
            triggerRepo.find!.mockResolvedValue([]);

            await expect(service.activate('tenant-123', 'flow-123'))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('pause', () => {
        it('should pause a flow', async () => {
            const flow = mockFlow();
            flowRepo.findOne!.mockResolvedValue(flow);
            triggerRepo.find!.mockResolvedValue([]);
            flowRepo.update!.mockResolvedValue({ affected: 1 });

            await service.pause('tenant-123', 'flow-123');

            expect(flowRepo.update).toHaveBeenCalledWith('flow-123', { status: 'paused' });
        });
    });

    describe('Triggers', () => {
        describe('createTrigger', () => {
            it('should create a trigger for a flow', async () => {
                const flow = mockFlow();
                flowRepo.findOne!.mockResolvedValue(flow);
                triggerRepo.find!.mockResolvedValue([]);
                triggerRepo.create!.mockImplementation((data) => ({ ...mockTrigger(), ...data }));
                triggerRepo.save!.mockImplementation((data) => Promise.resolve(data));

                const result = await service.createTrigger('tenant-123', {
                    flowId: 'flow-123',
                    type: 'keyword',
                    config: { keywords: ['START'], matchType: 'exact' },
                });

                expect(result.type).toBe('keyword');
            });
        });

        describe('updateTrigger', () => {
            it('should update a trigger', async () => {
                const trigger = mockTrigger();
                triggerRepo.findOne!.mockResolvedValue(trigger);
                triggerRepo.update!.mockResolvedValue({ affected: 1 });

                const result = await service.updateTrigger('tenant-123', 'trigger-123', {
                    active: false,
                });

                expect(triggerRepo.update).toHaveBeenCalled();
            });

            it('should throw if trigger not found', async () => {
                triggerRepo.findOne!.mockResolvedValue(null);

                await expect(
                    service.updateTrigger('tenant-123', 'non-existent', { active: false })
                ).rejects.toThrow(NotFoundException);
            });
        });

        describe('deleteTrigger', () => {
            it('should delete a trigger', async () => {
                const trigger = mockTrigger();
                triggerRepo.findOne!.mockResolvedValue(trigger);
                triggerRepo.delete!.mockResolvedValue({ affected: 1 });

                const result = await service.deleteTrigger('tenant-123', 'trigger-123');

                expect(result.message).toBe('Gatilho excluído');
            });
        });

        describe('getTriggersByFlow', () => {
            it('should return triggers for a flow', async () => {
                triggerRepo.find!.mockResolvedValue([mockTrigger()]);

                const result = await service.getTriggersByFlow('flow-123');

                expect(result).toHaveLength(1);
            });
        });
    });

    describe('Executions', () => {
        describe('startExecution', () => {
            it('should start a flow execution', async () => {
                const flow = mockFlow({ status: 'active' });
                flowRepo.findOne!.mockResolvedValue(flow);
                triggerRepo.find!.mockResolvedValue([]);
                executionRepo.create!.mockImplementation((data) => ({ ...mockExecution(), ...data }));
                executionRepo.save!.mockImplementation((data) => Promise.resolve(data));
                flowRepo.update!.mockResolvedValue({ affected: 1 });

                const result = await service.startExecution('tenant-123', {
                    flowId: 'flow-123',
                    contactId: 'contact-123',
                    instanceId: 'instance-123',
                });

                expect(result.status).toBe('running');
            });

            it('should throw if flow is not active', async () => {
                const flow = mockFlow({ status: 'draft' });
                flowRepo.findOne!.mockResolvedValue(flow);
                triggerRepo.find!.mockResolvedValue([]);

                await expect(
                    service.startExecution('tenant-123', {
                        flowId: 'flow-123',
                        contactId: 'contact-123',
                        instanceId: 'instance-123',
                    })
                ).rejects.toThrow(BadRequestException);
            });
        });

        describe('getExecutions', () => {
            it('should return executions', async () => {
                flowRepo.find!.mockResolvedValue([mockFlow()]);

                const result = await service.getExecutions('tenant-123');

                expect(result).toHaveLength(1);
            });
        });

        describe('getExecutionById', () => {
            it('should return execution by id', async () => {
                const execution = mockExecution();
                executionRepo.findOne!.mockResolvedValue(execution);

                const result = await service.getExecutionById('exec-123');

                expect(result!.id).toBe('exec-123');
            });
        });
    });

    describe('getStats', () => {
        it('should return flow statistics', async () => {
            const flows = [
                mockFlow({ status: 'active', executionCount: 10 }),
                mockFlow({ id: 'flow-2', status: 'draft', executionCount: 5 }),
            ];
            flowRepo.find!.mockResolvedValue(flows);

            const result = await service.getStats('tenant-123');

            expect(result.totalFlows).toBe(2);
            expect(result.active).toBe(1);
            expect(result.draft).toBe(1);
            expect(result.totalExecutions).toBe(15);
        });
    });
});
