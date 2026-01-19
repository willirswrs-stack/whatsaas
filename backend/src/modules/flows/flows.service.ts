import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flow, FlowExecution, FlowTrigger } from './entities';
import { CreateFlowDto, UpdateFlowDto, CreateTriggerDto, ExecuteFlowDto } from './dto';
import { InstancesService } from '../instances/instances.service';
import { ContactsService } from '../contacts/contacts.service';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';

@Injectable()
export class FlowsService {
    constructor(
        @InjectRepository(Flow)
        private flowRepository: Repository<Flow>,
        @InjectRepository(FlowExecution)
        private executionRepository: Repository<FlowExecution>,
        @InjectRepository(FlowTrigger)
        private triggerRepository: Repository<FlowTrigger>,
        private instancesService: InstancesService,
        private contactsService: ContactsService,
        private whatsappFactory: WhatsAppProviderFactory,
    ) { }

    // ============ FLOWS ============

    async findAll(tenantId: string) {
        return this.flowRepository.find({
            where: { tenantId },
            order: { updatedAt: 'DESC' },
        });
    }

    async findById(tenantId: string, id: string) {
        const flow = await this.flowRepository.findOne({
            where: { id, tenantId },
        });

        if (!flow) {
            throw new NotFoundException('Fluxo não encontrado');
        }

        // Get triggers
        const triggers = await this.triggerRepository.find({
            where: { flowId: id },
        });

        return { ...flow, triggers };
    }

    async create(tenantId: string, dto: CreateFlowDto) {
        // Create default start node
        const defaultNodes = [
            {
                id: 'start-1',
                type: 'start',
                position: { x: 250, y: 50 },
                data: {
                    label: 'Início do Fluxo',
                    type: 'start',
                    config: {},
                },
            },
        ];

        const flow = this.flowRepository.create({
            tenantId,
            name: dto.name,
            description: dto.description,
            channel: dto.channel,
            nodes: dto.nodes || defaultNodes,
            edges: dto.edges || [],
            status: 'draft',
        });

        return this.flowRepository.save(flow);
    }

    async update(tenantId: string, id: string, dto: UpdateFlowDto) {
        await this.findById(tenantId, id);
        await this.flowRepository.update(id, dto);
        return this.findById(tenantId, id);
    }

    async delete(tenantId: string, id: string) {
        await this.findById(tenantId, id);

        // Delete triggers first
        await this.triggerRepository.delete({ flowId: id });

        // Delete executions
        await this.executionRepository.delete({ flowId: id });

        // Delete flow
        await this.flowRepository.delete(id);

        return { message: 'Fluxo excluído com sucesso' };
    }

    async duplicate(tenantId: string, id: string) {
        const flow = await this.findById(tenantId, id);

        const newFlow = this.flowRepository.create({
            tenantId,
            name: `${flow.name} (Cópia)`,
            description: flow.description,
            nodes: flow.nodes,
            edges: flow.edges,
            status: 'draft',
        });

        return this.flowRepository.save(newFlow);
    }

    async activate(tenantId: string, id: string) {
        const flow = await this.findById(tenantId, id);

        // Validate flow has at least start node
        if (!flow.nodes || flow.nodes.length === 0) {
            throw new BadRequestException('O fluxo precisa ter pelo menos um nó');
        }

        await this.flowRepository.update(id, { status: 'active' });
        return this.findById(tenantId, id);
    }

    async pause(tenantId: string, id: string) {
        await this.findById(tenantId, id);
        await this.flowRepository.update(id, { status: 'paused' });
        return this.findById(tenantId, id);
    }

    // ============ TRIGGERS ============

    async createTrigger(tenantId: string, dto: CreateTriggerDto) {
        const flow = await this.findById(tenantId, dto.flowId);

        const trigger = this.triggerRepository.create({
            flowId: dto.flowId,
            tenantId,
            type: dto.type,
            config: dto.config || {},
            active: dto.active ?? true,
        });

        return this.triggerRepository.save(trigger);
    }

    async updateTrigger(tenantId: string, triggerId: string, dto: Partial<CreateTriggerDto>) {
        const trigger = await this.triggerRepository.findOne({
            where: { id: triggerId, tenantId },
        });

        if (!trigger) {
            throw new NotFoundException('Gatilho não encontrado');
        }

        await this.triggerRepository.update(triggerId, dto);
        return this.triggerRepository.findOne({ where: { id: triggerId } });
    }

    async deleteTrigger(tenantId: string, triggerId: string) {
        const trigger = await this.triggerRepository.findOne({
            where: { id: triggerId, tenantId },
        });

        if (!trigger) {
            throw new NotFoundException('Gatilho não encontrado');
        }

        await this.triggerRepository.delete(triggerId);
        return { message: 'Gatilho excluído' };
    }

    async getTriggersByFlow(flowId: string) {
        return this.triggerRepository.find({ where: { flowId } });
    }

    // ============ EXECUTIONS ============

    async startExecution(tenantId: string, dto: ExecuteFlowDto) {
        const flow = await this.findById(tenantId, dto.flowId);

        if (flow.status !== 'active') {
            throw new BadRequestException('O fluxo precisa estar ativo para ser executado');
        }

        // Find start node
        const startNode = flow.nodes.find(n => n.data.type === 'start');
        if (!startNode) {
            throw new BadRequestException('O fluxo não tem um nó de início');
        }

        const execution = this.executionRepository.create({
            flowId: dto.flowId,
            contactId: dto.contactId,
            instanceId: dto.instanceId,
            status: 'running',
            currentNodeId: startNode.id,
            variables: dto.initialVariables || {},
            logs: [{
                nodeId: startNode.id,
                action: 'started',
                timestamp: new Date().toISOString(),
            }],
        });

        const saved = await this.executionRepository.save(execution);

        // Update flow execution count
        await this.flowRepository.update(dto.flowId, {
            executionCount: () => 'execution_count + 1',
            lastExecutedAt: new Date(),
        });

        // Trigger Async Execution (Synchronous fallback for now)
        this.processExecution(saved.id).catch(err => console.error('Flow Execution Error:', err));

        return saved;
    }

    async processExecution(executionId: string) {
        const execution = await this.executionRepository.findOne({ where: { id: executionId } });
        if (!execution || execution.status !== 'running') return;

        const flow = await this.flowRepository.findOne({ where: { id: execution.flowId } });
        if (!flow) return;

        // Find Current Node
        const currentNode = flow.nodes.find(n => n.id === execution.currentNodeId);
        if (!currentNode) return;

        // Find Next Connected Node (Single path assumption for MVP)
        const edge = flow.edges.find(e => e.source === currentNode.id);
        if (!edge) {
            // End of execution
            execution.status = 'completed';
            execution.completedAt = new Date();
            await this.executionRepository.save(execution);
            return;
        }

        const nextNode = flow.nodes.find(n => n.id === edge.target);
        if (!nextNode) return;

        // Move to next node
        execution.currentNodeId = nextNode.id;

        // Process Node Logic
        if (nextNode.data?.type === 'message' || nextNode.type === 'message') { // Handle different node structures
            try {
                const instance = await this.instancesService.findById(execution.instanceId);
                const contact = await this.contactsService.findById(execution.contactId); // Assuming internal method exists or findById

                if (instance && contact && instance.status === 'connected') {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    const nodeData = nextNode.data as any;
                    const content = nodeData?.config?.message || nodeData?.content || 'Olá'; // Fallback

                    console.log('[FlowExecution] 📤 Sending message:', {
                        executionId,
                        nodeId: nextNode.id,
                        nodeData: JSON.stringify(nodeData),
                        extractedContent: content,
                        instanceName: instance.instanceName,
                        contactPhone: contact.phone,
                    });

                    await provider.sendText(instance.instanceName, contact.phone, content);

                    // Log success
                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'sent',
                        timestamp: new Date().toISOString(),
                        data: { type: 'message', status: 'sent' }
                    });
                }
            } catch (error) {
                console.error('Error sending flow message:', error);
                execution.status = 'failed';
                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'error',
                    timestamp: new Date().toISOString(),
                    data: { error: error.message }
                });
            }
        }

        // Mark as completed for now (Single step execution)
        execution.status = 'completed';
        execution.completedAt = new Date();
        await this.executionRepository.save(execution);
    }

    async getExecutions(tenantId: string, flowId?: string) {
        const flows = await this.flowRepository.find({ where: { tenantId } });
        const flowIds = flows.map(f => f.id);

        const query = this.executionRepository.createQueryBuilder('execution')
            .where('execution.flow_id IN (:...flowIds)', { flowIds });

        if (flowId) {
            query.andWhere('execution.flow_id = :flowId', { flowId });
        }

        return query
            .orderBy('execution.started_at', 'DESC')
            .limit(100)
            .getMany();
    }

    async getExecutionById(id: string) {
        return this.executionRepository.findOne({ where: { id } });
    }

    // ============ STATISTICS ============

    async getStats(tenantId: string) {
        const flows = await this.flowRepository.find({ where: { tenantId } });

        const active = flows.filter(f => f.status === 'active').length;
        const draft = flows.filter(f => f.status === 'draft').length;
        const paused = flows.filter(f => f.status === 'paused').length;

        const totalExecutions = flows.reduce((acc, f) => acc + f.executionCount, 0);

        return {
            totalFlows: flows.length,
            active,
            draft,
            paused,
            totalExecutions,
            topFlows: flows
                .sort((a, b) => b.executionCount - a.executionCount)
                .slice(0, 5)
                .map(f => ({
                    id: f.id,
                    name: f.name,
                    executions: f.executionCount,
                })),
        };
    }
}
