import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Flow, FlowExecution, FlowTrigger } from './entities';
import { CreateFlowDto, UpdateFlowDto, CreateTriggerDto, ExecuteFlowDto } from './dto';
import { InstancesService } from '../instances/instances.service';
import { ContactsService } from '../contacts/contacts.service';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { AiService } from '../ai/ai.service';

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
        @Inject(AiService)
        private aiService: AiService,
        private configService: ConfigService,
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
        // 1. Fetch current state
        const execution = await this.executionRepository.findOne({ where: { id: executionId } });
        if (!execution || execution.status !== 'running') return;

        const flow = await this.flowRepository.findOne({ where: { id: execution.flowId } });
        if (!flow) return;

        // 2. Find Next Node via Edge
        const currentNodeId = execution.currentNodeId;
        const edge = flow.edges.find(e => e.source === currentNodeId);

        if (!edge) {
            // No more edges = End of flow
            execution.status = 'completed';
            execution.completedAt = new Date();
            await this.executionRepository.save(execution);
            return;
        }

        const nextNode = flow.nodes.find(n => n.id === edge.target);
        if (!nextNode) {
            execution.status = 'completed';
            execution.completedAt = new Date();
            await this.executionRepository.save(execution);
            return;
        }

        // 3. Update execution state to the node we are about to process
        // This prevents double-processing if processExecution is called again
        execution.currentNodeId = nextNode.id;
        execution.status = 'running';
        execution.completedAt = null as any;
        await this.executionRepository.save(execution);

        const nodeType = nextNode.type || nextNode.data?.type;
        console.log(`[Flow] Processing node: ${nextNode.id}, type: ${nodeType}`);
        const aiNodeTypes = ['gpt', 'openai', 'anthropic', 'gemini', 'groq', 'customLlm'];

        try {
            // Process AI Nodes
            if (aiNodeTypes.includes(nodeType)) {
                const instance = await this.instancesService.findById(execution.instanceId);
                const contact = await this.contactsService.findById(execution.contactId);
                const nodeData = nextNode.data as any;
                const systemPrompt = nodeData?.config?.prompt;
                const userMessage = execution.variables?.lastUserMessage || 'Olá';

                let apiKey = nodeData?.config?.apiKey || nodeData?.config?.token;
                if (!apiKey || apiKey.trim() === '') {
                    apiKey = this.configService.get<string>('OPENAI_API_KEY');
                }

                const responseContent = await this.aiService.generateResponseWithKey(
                    systemPrompt || 'Você é um assistente útil.',
                    userMessage,
                    apiKey,
                    'openai'
                );

                if (instance?.status === 'connected' && contact) {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    await provider.sendText(instance.instanceName, contact.phone, responseContent);
                }

                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'gpt_response',
                    timestamp: new Date().toISOString(),
                    data: { response: responseContent }
                });
            }

            // Process Message Node
            else if (nodeType === 'message') {
                const instance = await this.instancesService.findById(execution.instanceId);
                const contact = await this.contactsService.findById(execution.contactId);

                if (instance?.status === 'connected' && contact) {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    const nodeData = nextNode.data as any;
                    const content = nodeData?.config?.message || nodeData?.content || 'Olá';

                    await provider.sendText(instance.instanceName, contact.phone, content);
                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'sent',
                        timestamp: new Date().toISOString(),
                        data: { type: 'message', status: 'sent' }
                    });
                }
            }

            // Process Media Node
            else if (['video', 'media', 'image', 'audio', 'document'].includes(nodeType)) {
                const instance = await this.instancesService.findById(execution.instanceId);
                const contact = await this.contactsService.findById(execution.contactId);

                if (instance?.status === 'connected' && contact) {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    const nodeData = nextNode.data as any;
                    const mediaUrl = nodeData?.config?.mediaUrl || nodeData?.config?.url || nodeData?.config?.file;
                    const caption = nodeData?.config?.caption || nodeData?.config?.message || '';
                    const mediaType = nodeData?.config?.mediaType || nodeType;

                    if (mediaUrl) {
                        try {
                            await provider.sendMedia(instance.instanceName, contact.phone, {
                                type: mediaType as any,
                                url: mediaUrl,
                                caption: caption,
                            });
                            execution.logs.push({
                                nodeId: nextNode.id,
                                action: 'media_sent',
                                timestamp: new Date().toISOString(),
                                data: { type: mediaType, status: 'sent' }
                            });
                        } catch (mediaErr) {
                            console.error(`Media Send Error at node ${nextNode.id}:`, mediaErr.message);
                            execution.logs.push({
                                nodeId: nextNode.id,
                                action: 'media_failed',
                                timestamp: new Date().toISOString(),
                                data: { type: mediaType, error: mediaErr.message }
                            });
                            // We continue even if media fails? For now YES, to avoid blocking links/etc.
                        }
                    }
                }
            }

            // Process Link Node
            else if (['link', 'send_link'].includes(nodeType)) {
                const instance = await this.instancesService.findById(execution.instanceId);
                const contact = await this.contactsService.findById(execution.contactId);

                if (instance?.status === 'connected' && contact) {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    const nodeData = nextNode.data as any;
                    const url = nodeData?.config?.url || nodeData?.config?.link || '';
                    const caption = nodeData?.config?.caption || nodeData?.config?.message || '';
                    const fullMessage = caption ? `${caption}\n${url}` : url;

                    if (url) {
                        await provider.sendText(instance.instanceName, contact.phone, fullMessage);
                        execution.logs.push({
                            nodeId: nextNode.id,
                            action: 'link_sent',
                            timestamp: new Date().toISOString(),
                            data: { url, status: 'sent' }
                        });
                    }
                }
            }

            // Process SMS Node
            else if (['sms', 'send_sms'].includes(nodeType)) {
                const instance = await this.instancesService.findById(execution.instanceId);
                const contact = await this.contactsService.findById(execution.contactId);

                if (instance?.status === 'connected' && contact) {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    const nodeData = nextNode.data as any;
                    const message = nodeData?.config?.message || '';
                    const phoneNumber = nodeData?.config?.phoneNumber || contact.phone;

                    if (message) {
                        await provider.sendText(instance.instanceName, phoneNumber, `[SMS] ${message}`);
                        execution.logs.push({
                            nodeId: nextNode.id,
                            action: 'sms_sent',
                            timestamp: new Date().toISOString(),
                            data: { to: phoneNumber, status: 'sent' }
                        });
                    }
                }
            }

            // Process Question Node
            else if (['question', 'pergunta', 'ask_question'].includes(nodeType)) {
                const instance = await this.instancesService.findById(execution.instanceId);
                const contact = await this.contactsService.findById(execution.contactId);

                if (instance?.status === 'connected' && contact) {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    const nodeData = nextNode.data as any;
                    const questionText = nodeData?.config?.question || 'Qual sua resposta?';
                    const saveTo = nodeData?.config?.saveTo || 'lastAnswer';

                    await provider.sendText(instance.instanceName, contact.phone, questionText);

                    execution.status = 'waiting_response';
                    execution.variables = {
                        ...execution.variables,
                        waitingForAnswer: true,
                        waitingNodeId: nextNode.id,
                        waitingSaveTo: saveTo,
                    };

                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'question_sent',
                        timestamp: new Date().toISOString(),
                    });

                    await this.executionRepository.save(execution);
                    return; // Stop auto-advance
                }
            }

            // Process Delay Node
            else if (['delay', 'wait', 'esperar'].includes(nodeType)) {
                const nodeData = nextNode.data as any;
                const delaySeconds = parseInt(nodeData?.config?.seconds || '5', 10);

                console.log(`[Flow] Processing Delay Node: ${delaySeconds} seconds`);

                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'delay',
                    timestamp: new Date().toISOString(),
                    data: { delaySeconds }
                });

                // Update execution state
                execution.status = 'running'; // Keep running as we use setTimeout
                execution.nextActionAt = new Date(Date.now() + delaySeconds * 1000);

                await this.executionRepository.save(execution);

                setTimeout(() => this.processExecution(executionId), delaySeconds * 1000);
                return;
            }

            // Finalize this step
            await this.executionRepository.save(execution);

            if (nodeType === 'end') {
                execution.status = 'completed';
                execution.completedAt = new Date();
                await this.executionRepository.save(execution);
                return;
            }

            // Continue to next node
            this.processExecution(executionId);

        } catch (error) {
            console.error(`Error processing flow node ${nodeType}:`, error);
            execution.status = 'failed';
            execution.logs.push({
                nodeId: nextNode.id,
                action: 'error',
                timestamp: new Date().toISOString(),
                data: { error: error.message }
            });
            await this.executionRepository.save(execution);
        }
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
