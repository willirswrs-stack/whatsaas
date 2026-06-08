import { Injectable, NotFoundException, BadRequestException, Inject, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignContact } from '../campaigns/entities/campaign.entity';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Flow, FlowExecution, FlowTrigger } from './entities';
import { CreateFlowDto, UpdateFlowDto, CreateTriggerDto, ExecuteFlowDto } from './dto';
import { InstancesService } from '../instances/instances.service';
import { ContactsService } from '../contacts/contacts.service';
import { WhatsAppProviderFactory } from '../whatsapp/whatsapp-provider.factory';
import { AiService } from '../ai/ai.service';
import { FLOW_QUEUE } from '../../config/bull.config';
import { MetaGraphApiService } from '../meta-templates/meta-graph-api.service';
import { ActivePreventionService } from '../anti-ban/active-prevention.service';
import { HumanBehaviorService } from '../anti-ban/human-behavior.service';
import { InboxService } from '../inbox/inbox.service';

@Injectable()
export class FlowsService implements OnModuleInit {
    constructor(
        @InjectRepository(Flow)
        private flowRepository: Repository<Flow>,
        @InjectRepository(FlowExecution)
        private executionRepository: Repository<FlowExecution>,
        @InjectRepository(FlowTrigger)
        private triggerRepository: Repository<FlowTrigger>,
        @InjectRepository(CampaignContact)
        private campaignContactRepository: Repository<CampaignContact>,
        @InjectQueue(FLOW_QUEUE) private flowQueue: Queue,
        private instancesService: InstancesService,
        private contactsService: ContactsService,
        private whatsappFactory: WhatsAppProviderFactory,
        @Inject(AiService)
        private aiService: AiService,
        private configService: ConfigService,
        private metaGraphApiService: MetaGraphApiService,
        private activePrevention: ActivePreventionService,
        private humanBehavior: HumanBehaviorService,
        private inboxService: InboxService,
    ) { }

    // ============ FLOWS ============

    onModuleInit() {
        // Recover delayed executions periodically (every minute)
        setInterval(() => {
            this.recoverDelayedExecutions();
        }, 60000);
    }

    async recoverDelayedExecutions() {
        try {
            const delayedExecutions = await this.executionRepository
                .createQueryBuilder('execution')
                // FIX: Include 'delayed' status — delay node sets status='delayed', not 'running'
                .where("execution.status IN ('running', 'delayed')")
                .andWhere('execution.nextActionAt <= :now', { now: new Date() })
                .getMany();

            if (delayedExecutions.length > 0) {
                console.log(`[Flow] Recovering ${delayedExecutions.length} delayed executions`);
                delayedExecutions.forEach(exec => {
                    // FIX: Call resumeExecution (resets status + nextActionAt) instead of processExecution
                    this.resumeExecution(exec.id).catch(err => console.error(`Error recovering execution ${exec.id}:`, err));
                });
            }
        } catch (error) {
            console.error('Error recovering delayed executions:', error);
        }
    }

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

        // Get execution stats
        try {
            // Executing count: grouped by currentNodeId regarding active executions
            const executingStats = await this.executionRepository
                .createQueryBuilder('execution')
                .select('execution.currentNodeId', 'nodeId')
                .addSelect('COUNT(*)', 'count')
                .where('execution.flowId = :flowId', { flowId: id })
                .andWhere("execution.status IN ('running', 'waiting_response')")
                .andWhere('execution.currentNodeId IS NOT NULL')
                .groupBy('execution.currentNodeId')
                .getRawMany();

            // Sent count: grouped by nodeId from logs (using raw query for jsonb array elements)
            // Note: This assumes Postgres database with JSONB support
            const sentStats = await this.executionRepository.query(
                `SELECT log->>'nodeId' as node_id, count(*) as count 
                 FROM flow_executions, jsonb_array_elements(logs) as log 
                 WHERE flow_id = $1 
                 GROUP BY log->>'nodeId'`,
                [id]
            );

            // Create stats map
            const statsMap: Record<string, { executing: number, sent: number }> = {};

            // Process executing stats
            executingStats.forEach(stat => {
                const nodeId = stat.nodeId;
                if (!statsMap[nodeId]) statsMap[nodeId] = { executing: 0, sent: 0 };
                statsMap[nodeId].executing = parseInt(stat.count, 10);
            });

            // Process sent stats
            sentStats.forEach((stat: any) => {
                const nodeId = stat.node_id;
                if (!statsMap[nodeId]) statsMap[nodeId] = { executing: 0, sent: 0 };
                statsMap[nodeId].sent = parseInt(stat.count, 10);
            });

            // Inject stats into flow nodes
            if (flow.nodes && Array.isArray(flow.nodes)) {
                flow.nodes = flow.nodes.map(node => ({
                    ...node,
                    data: {
                        ...node.data,
                        stats: statsMap[node.id] || { executing: 0, sent: 0 }
                    }
                }));
            }

        } catch (error) {
            console.error('Error fetching flow stats:', error);
            // Continue without stats if error occurs
        }

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

        // --- Business Hours Check ---
        const hoursConfig = startNode.data.config?.businessHours;
        if (hoursConfig?.enabled && !dto.initialVariables?.isTest) {
            const isInside = this.isWithinBusinessHours(hoursConfig);
            if (!isInside) {
                console.log(`[Flow] Execution blocked for ${flow.name}: Outside business hours.`);
                // For now, we just don't start it. 
                // Later we could redirect to a specific node or send a message.
                return null;
            }
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

    /**
     * Find the next edge from a node, handling sourceHandle correctly.
     * For sequential flow (non-branching), picks the edge without sourceHandle
     * or with sourceHandle null. For branching nodes, picks based on handle.
     */
    private findNextEdge(edges: any[], currentNodeId: string, preferredHandle?: string | null): any {
        // Get all edges from this node
        const outEdges = edges.filter(e => e.source === currentNodeId);

        if (outEdges.length === 0) return null;
        if (outEdges.length === 1) return outEdges[0];

        // If a preferred handle is specified, look for it
        if (preferredHandle) {
            const handleEdge = outEdges.find(e => e.sourceHandle === preferredHandle);
            if (handleEdge) return handleEdge;
        }

        // Prefer edges WITHOUT sourceHandle (the "default" / sequential path)
        const defaultEdge = outEdges.find(e => !e.sourceHandle || e.sourceHandle === null || e.sourceHandle === undefined);
        if (defaultEdge) return defaultEdge;

        // Fallback: return the first edge (legacy behavior)
        console.warn(`[Flow] Multiple edges from node ${currentNodeId} with no default — using first edge. Edges: ${JSON.stringify(outEdges.map(e => ({ id: e.id, sourceHandle: e.sourceHandle, target: e.target })))}`);
        return outEdges[0];
    }

    async updateCampaignContactMessageId(execution: any, messageId: string) {
        const campaignContactId = execution.variables?.campaignContactId;
        if (campaignContactId && messageId) {
            try {
                await this.campaignContactRepository.update(campaignContactId, {
                    messageId: messageId,
                    status: 'sent',
                    sentAt: new Date()
                });
            } catch (err) {
                console.error(`[Flow] Error updating campaign contact ${campaignContactId}:`, err.message);
            }
        }
    }

    /**
     * Helper to get instance and contact for a given execution
     */
    private async getExecutionContext(execution: any) {
        const instance = await this.instancesService.findById(execution.instanceId);
        const contact = await this.contactsService.findById(execution.contactId);
        return { instance, contact };
    }

    /**
     * Resolve media URLs so they are accessible from Docker containers.
     * Rewrites local/private IP addresses to host.docker.internal,
     * which Docker Desktop resolves to the host machine.
     */
    private resolveMediaUrl(url: string): string {
        if (!url) return url;

        try {
            const parsed = new URL(url);
            const hostname = parsed.hostname;

            // Check if host is a private/local IP or localhost
            const isPrivateIp = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
            const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

            if (isPrivateIp || isLocalhost) {
                const port = this.configService.get('PORT', 3333);
                // Only rewrite if it's pointing to our backend port
                if (parsed.port === String(port) || (!parsed.port && port === 80)) {
                    parsed.hostname = 'host.docker.internal';
                    const resolved = parsed.toString();
                    console.log(`[Flow] URL rewrite: ${url} → ${resolved}`);
                    return resolved;
                }
            }
        } catch (e) {
            // If URL parsing fails, return as-is
        }

        return url;
    }

    async processExecution(executionId: string) {
        // 1. Fetch current state
        const execution = await this.executionRepository.findOne({ where: { id: executionId } });
        if (!execution || execution.status !== 'running') {
            if (execution) console.log(`[Flow] Execution ${executionId.slice(0, 8)} skipped (status: ${execution.status})`);
            return;
        }

        // FIX: If there's still a pending delay, skip this call — BullMQ will resume it at the right time.
        // Previously this used an inline setTimeout which would block the Node.js event loop for hours.
        if (execution.nextActionAt) {
            const remaining = execution.nextActionAt.getTime() - Date.now();
            if (remaining > 500) {
                console.log(`[Flow] ⏳ Execution ${executionId.slice(0, 8)} still delayed for ${Math.ceil(remaining / 1000)}s — skipping (BullMQ will resume)`);
                return; // BullMQ job will call resumeExecution() when the time comes
            }
            // Delay has elapsed — clear the marker and proceed
            execution.nextActionAt = null;
            await this.executionRepository.save(execution);
        }

        const flow = await this.flowRepository.findOne({ where: { id: execution.flowId } });
        if (!flow) {
            console.error(`[Flow] Flow not found for execution ${executionId}`);
            return;
        }
        const tenantId = flow.tenantId;

        // 2. Find Next Node via Edge (using improved logic)
        const currentNodeId = execution.currentNodeId;
        const edge = this.findNextEdge(flow.edges, currentNodeId);

        if (!edge) {
            console.log(`[Flow] End of flow reached for execution ${executionId} (no outgoing edges from ${currentNodeId})`);
            execution.status = 'completed';
            execution.completedAt = new Date();
            await this.executionRepository.save(execution);
            return;
        }

        const nextNode = flow.nodes.find(n => n.id === edge.target);
        if (!nextNode) {
            console.error(`[Flow] Next node not found: ${edge.target} (from edge ${edge.id})`);
            execution.status = 'completed';
            execution.completedAt = new Date();
            await this.executionRepository.save(execution);
            return;
        }

        // 3. Update execution state to the node we are about to process
        execution.currentNodeId = nextNode.id;
        execution.status = 'running';
        execution.completedAt = null as any;
        await this.executionRepository.save(execution);

        // Resolve the node type — prefer data.type over the React Flow node type key
        const nodeType = nextNode.data?.type || nextNode.type;
        console.log(`[Flow] [${executionId.slice(0, 8)}] ▶ Processing node: ${nextNode.id} | type: ${nodeType} | label: ${nextNode.data?.label || '-'} | from edge: ${edge.id} (handle: ${edge.sourceHandle || 'default'})`);

        const aiNodeTypes = ['gpt', 'openai', 'anthropic', 'gemini', 'groq', 'customLlm'];

        try {
            // ==================== AI NODES ====================
            if (aiNodeTypes.includes(nodeType)) {
                const { instance, contact } = await this.getExecutionContext(execution);
                const nodeData = nextNode.data as any;
                const systemPrompt = nodeData?.config?.prompt;

                // ===== VARIATION ENGINE =====
                // Generate a unique "personality seed" for EACH execution so every contact
                // receives a significantly different message style and approach.
                const variationStyles = [
                    'Escreva de forma direta e objetiva, como um profissional experiente. Use frases curtas e impactantes.',
                    'Escreva de forma curiosa e consultiva, fazendo perguntas retóricas. Use um tom de quem quer genuinamente ajudar.',
                    'Escreva de forma entusiasmada e energética, com exclamações e emojis. Mostre empolgação real pelo assunto.',
                    'Escreva de forma analítica e técnica, citando dados e comparações. Use um tom de especialista.',
                    'Escreva de forma casual e amigável, como se fosse um amigo dando uma dica. Use gírias leves.',
                    'Escreva de forma storytelling, começando com uma mini-história ou caso real antes de ir ao ponto.',
                    'Escreva de forma provocativa e desafiadora, questionando o status quo do destinatário.',
                    'Escreva de forma educativa, como se estivesse ensinando algo novo. Use "Você sabia que...".',
                    'Escreva de forma empática e acolhedora, mostrando que entende os desafios do destinatário.',
                    'Escreva de forma urgente mas respeitosa, destacando oportunidade limitada ou timing perfeito.',
                    'Escreva de forma minimalista, com poucas palavras mas muito impacto. Menos é mais.',
                    'Escreva como se estivesse continuando uma conversa anterior, de forma natural e fluida.',
                ];

                const randomStyle = variationStyles[Math.floor(Math.random() * variationStyles.length)];
                const randomSeed = Math.floor(Math.random() * 99999);

                // Build enhanced system prompt with variation injection
                const enhancedSystemPrompt = `${systemPrompt || 'Você é um assistente útil.'}\n\n---\n## INSTRUÇÕES DE ESTILO PARA ESTA EXECUÇÃO (seed: ${randomSeed}):\n${randomStyle}\n\nIMPORTANTE: Gere uma mensagem COMPLETAMENTE ÚNICA. Varie a estrutura das frases, o vocabulário, a abertura, o fechamento e o tom. NUNCA repita a mesma estrutura de outras mensagens. Cada mensagem deve parecer escrita por uma pessoa diferente.\nNão use introduções como "Aqui está" ou "Segue a mensagem". Retorne APENAS o texto final da mensagem.`;

                // For direct outbound sequence, the user hasn't spoken yet.
                let userMessage = execution.variables?.lastUserMessage;
                if (!userMessage) {
                    userMessage = `Gere a mensagem final agora. Use o estilo descrito acima. Seed de variação: #${randomSeed}. Retorne APENAS o texto a ser enviado, sem prefácios.`;
                }

                let apiKey = nodeData?.config?.apiKey || nodeData?.config?.token;
                if (!apiKey || apiKey.trim() === '') {
                    apiKey = this.configService.get<string>('OPENAI_API_KEY');
                }

                if (instance?.status === 'connected' && contact) {
                    const responseContent = await this.aiService.generateResponseWithKey(
                        enhancedSystemPrompt,
                        userMessage,
                        apiKey,
                        'openai'
                    );
                    const provider = this.whatsappFactory.getProvider(instance.provider);

                    // PREVENÇÃO ATIVA
                    const timing = this.humanBehavior.generateTimingMetadata(responseContent);
                    await provider.sendPresence?.(instance.instanceName, contact.phone, 'composing', timing.typingDurationMs);
                    await this.activePrevention.applyPrevention(instance.id);

                    const res = await provider.sendText(instance.instanceName, contact.phone, responseContent);
                    const messageId = res?.messageId;
                    if (messageId) {
                        await this.updateCampaignContactMessageId(execution, messageId);
                        await this.inboxService.saveMessage({
                            tenantId,
                            instanceId: instance.id,
                            instanceName: instance.instanceName,
                            remoteJid: `${contact.phone}@s.whatsapp.net`,
                            remotePhone: contact.phone,
                            remoteName: contact.name,
                            direction: 'outbound',
                            type: 'text',
                            content: responseContent,
                            status: 'sent',
                            wamid: messageId,
                            contactId: contact.id,
                        }).catch(err => console.error(`[Flow] Error saving AI message to inbox:`, err.message));
                    }

                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'gpt_response',
                        timestamp: new Date().toISOString(),
                        data: { response: responseContent, variationStyle: randomStyle.substring(0, 50), seed: randomSeed }
                    });
                    console.log(`[Flow] 🎯 AI variation applied: style="${randomStyle.substring(0, 40)}..." seed=${randomSeed}`);
                } else {
                    console.warn(`[Flow] Instance not connected or contact missing for AI node ${nextNode.id}`);
                }
            }

            // ==================== MESSAGE NODE ====================
            else if (nodeType === 'message') {
                const { instance, contact } = await this.getExecutionContext(execution);

                if (instance?.status === 'connected' && contact) {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    const nodeData = nextNode.data as any;
                    const content = nodeData?.config?.message || nodeData?.content || 'Olá';

                    // PREVENÇÃO ATIVA
                    const timing = this.humanBehavior.generateTimingMetadata(content);
                    await provider.sendPresence?.(instance.instanceName, contact.phone, 'composing', timing.typingDurationMs);
                    await this.activePrevention.applyPrevention(instance.id);

                    const res = await provider.sendText(instance.instanceName, contact.phone, content);
                    const messageId = res?.messageId;
                    if (messageId) {
                        await this.updateCampaignContactMessageId(execution, messageId);
                        await this.inboxService.saveMessage({
                            tenantId,
                            instanceId: instance.id,
                            instanceName: instance.instanceName,
                            remoteJid: `${contact.phone}@s.whatsapp.net`,
                            remotePhone: contact.phone,
                            remoteName: contact.name,
                            direction: 'outbound',
                            type: 'text',
                            content: content,
                            status: 'sent',
                            wamid: messageId,
                            contactId: contact.id,
                        }).catch(err => console.error(`[Flow] Error saving text message to inbox:`, err.message));
                    }

                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'sent',
                        timestamp: new Date().toISOString(),
                        data: { type: 'message', status: 'sent', messageId }
                    });
                } else {
                    console.warn(`[Flow] Instance not connected or contact missing for Message node ${nextNode.id}`);
                }
            }

            // ==================== MEDIA NODES (video, image, audio, document, sticker) ====================
            else if (['video', 'media', 'image', 'audio', 'document', 'sticker'].includes(nodeType)) {
                const { instance, contact } = await this.getExecutionContext(execution);

                if (instance?.status === 'connected' && contact) {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    const nodeData = nextNode.data as any;
                    const rawMediaUrl = nodeData?.config?.mediaUrl || nodeData?.config?.url || nodeData?.config?.file;
                    const mediaUrl = this.resolveMediaUrl(rawMediaUrl);
                    const caption = nodeData?.config?.caption || nodeData?.config?.message || '';
                    const mediaType = nodeData?.config?.mediaType || (nodeType === 'sticker' ? 'sticker' : nodeType);

                    if (mediaUrl) {
                        try {
                            // PREVENÇÃO ATIVA
                            await provider.sendPresence?.(instance.instanceName, contact.phone, 'recording', 2000);
                            await this.activePrevention.applyPrevention(instance.id);

                            const res = await provider.sendMedia(instance.instanceName, contact.phone, {
                                type: mediaType as any,
                                url: mediaUrl,
                                caption: nodeType === 'sticker' ? '' : caption,
                            });
                            const messageId = res?.messageId;
                            if (messageId) {
                                await this.updateCampaignContactMessageId(execution, messageId);
                                await this.inboxService.saveMessage({
                                    tenantId,
                                    instanceId: instance.id,
                                    instanceName: instance.instanceName,
                                    remoteJid: `${contact.phone}@s.whatsapp.net`,
                                    remotePhone: contact.phone,
                                    remoteName: contact.name,
                                    direction: 'outbound',
                                    type: mediaType === 'sticker' ? 'sticker' : (mediaType === 'image' || mediaType === 'video' || mediaType === 'audio' || mediaType === 'document' ? mediaType : 'text'),
                                    content: caption || `[Media: ${mediaType}]`,
                                    mediaUrl: mediaUrl,
                                    status: 'sent',
                                    wamid: messageId,
                                    contactId: contact.id,
                                }).catch(err => console.error(`[Flow] Error saving media message to inbox:`, err.message));
                            }

                            execution.logs.push({
                                nodeId: nextNode.id,
                                action: 'media_sent',
                                timestamp: new Date().toISOString(),
                                data: { type: mediaType, status: 'sent', messageId }
                            });
                        } catch (mediaErr) {
                            console.error(`[Flow] Media Send Error at node ${nextNode.id}:`, mediaErr.message);
                            execution.logs.push({
                                nodeId: nextNode.id,
                                action: 'media_failed',
                                timestamp: new Date().toISOString(),
                                data: { type: mediaType, error: mediaErr.message }
                            });
                        }
                    } else {
                        console.warn(`[Flow] No media URL configured for node ${nextNode.id}`);
                        execution.logs.push({
                            nodeId: nextNode.id,
                            action: 'media_skipped',
                            timestamp: new Date().toISOString(),
                            data: { reason: 'no_media_url' }
                        });
                    }
                } else {
                    console.warn(`[Flow] Instance not connected for Media node ${nextNode.id}`);
                }
            }

            // ==================== LINK NODE ====================
            else if (['link', 'send_link'].includes(nodeType)) {
                const { instance, contact } = await this.getExecutionContext(execution);

                if (instance?.status === 'connected' && contact) {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    const nodeData = nextNode.data as any;
                    const url = nodeData?.config?.url || nodeData?.config?.link || '';
                    const caption = nodeData?.config?.caption || nodeData?.config?.message || '';
                    const fullMessage = caption ? `${caption}\n${url}` : url;

                    if (url) {
                        const res = await provider.sendText(instance.instanceName, contact.phone, fullMessage);
                        if (res?.messageId) {
                            await this.inboxService.saveMessage({
                                tenantId,
                                instanceId: instance.id,
                                instanceName: instance.instanceName,
                                remoteJid: `${contact.phone}@s.whatsapp.net`,
                                remotePhone: contact.phone,
                                remoteName: contact.name,
                                direction: 'outbound',
                                type: 'text',
                                content: fullMessage,
                                status: 'sent',
                                wamid: res.messageId,
                                contactId: contact.id,
                            }).catch(err => console.error(`[Flow] Error saving link message to inbox:`, err.message));
                        }
                        execution.logs.push({
                            nodeId: nextNode.id,
                            action: 'link_sent',
                            timestamp: new Date().toISOString(),
                            data: { url, status: 'sent' }
                        });
                    }
                }
            }

            // ==================== BUTTONS NODES (buttonsDefault, buttonsCopy, buttonsActions) ====================
            else if (['buttonsDefault', 'buttonsCopy', 'buttonsActions', 'buttons'].includes(nodeType)) {
                const { instance, contact } = await this.getExecutionContext(execution);

                if (instance?.status === 'connected' && contact) {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    const nodeData = nextNode.data as any;
                    const message = nodeData?.config?.message || nodeData?.config?.text || 'Escolha uma opção:';
                    const buttons = nodeData?.config?.buttons || [];

                    // PREVENÇÃO ATIVA
                    await provider.sendPresence?.(instance.instanceName, contact.phone, 'composing', 2000);
                    await this.activePrevention.applyPrevention(instance.id);

                    // Try sending real interactive buttons if supported by provider (e.g. Evolution API)
                    let finalMessageId: string | undefined;
                    let finalContent = message;

                    try {
                        // Evolution Cloud specific (if supported)
                        if ((instance.provider as string) === 'evolution_cloud' && (provider as any).sendButtons) {
                            const res = await (provider as any).sendButtons(instance.instanceName, contact.phone, {
                                text: message,
                                buttons: buttons.map((b: any) => ({
                                    id: b.id || `btn-${Math.random().toString(36).substr(2, 9)}`,
                                    label: b.label || b.text || b
                                }))
                            });
                            finalMessageId = res?.messageId;
                        } else {
                            // Fallback: Send as text with numbered list
                            if (buttons.length > 0) {
                                const buttonList = buttons.map((b: any, i: number) => `${i + 1}. ${b.label || b.text || b}`).join('\n');
                                finalContent = `${message}\n\n${buttonList}`;
                            }
                            const res = await provider.sendText(instance.instanceName, contact.phone, finalContent);
                            finalMessageId = res?.messageId;
                        }
                    } catch (btnErr) {
                        console.error(`[Flow] Error sending buttons at node ${nextNode.id}, falling back to text:`, btnErr.message);
                        if (buttons.length > 0) {
                            const buttonList = buttons.map((b: any, i: number) => `${i + 1}. ${b.label || b.text || b}`).join('\n');
                            finalContent = `${message}\n\n${buttonList}`;
                        }
                        const res = await provider.sendText(instance.instanceName, contact.phone, finalContent);
                        finalMessageId = res?.messageId;
                    }

                    if (finalMessageId) {
                        await this.updateCampaignContactMessageId(execution, finalMessageId);
                        await this.inboxService.saveMessage({
                            tenantId,
                            instanceId: instance.id,
                            instanceName: instance.instanceName,
                            remoteJid: `${contact.phone}@s.whatsapp.net`,
                            remotePhone: contact.phone,
                            remoteName: contact.name,
                            direction: 'outbound',
                            type: 'text',
                            content: finalContent,
                            status: 'sent',
                            wamid: finalMessageId,
                            contactId: contact.id,
                        }).catch(err => console.error(`[Flow] Error saving buttons message to inbox:`, err.message));
                    }

                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'buttons_sent',
                        timestamp: new Date().toISOString(),
                        data: { type: nodeType, buttonsCount: buttons.length, status: 'sent' }
                    });
                } else {
                    console.warn(`[Flow] Instance not connected for Buttons node ${nextNode.id}`);
                }
            }

            // ==================== SMS NODE ====================
            else if (['sms', 'send_sms'].includes(nodeType)) {
                const { instance, contact } = await this.getExecutionContext(execution);
                if (contact) {
                    const nodeData = nextNode.data as any;
                    const message = nodeData?.config?.message || '';
                    const phoneNumber = nodeData?.config?.phoneNumber || contact.phone;

                    if (message) {
                        execution.logs.push({
                            nodeId: nextNode.id,
                            action: 'sms_mock',
                            timestamp: new Date().toISOString(),
                            data: { to: phoneNumber, status: 'mocked' }
                        });
                    }
                }
            }

            // ==================== EMAIL NODE ====================
            else if (['email', 'send_email'].includes(nodeType)) {
                const nodeData = nextNode.data as any;
                console.log(`[Flow] Email node ${nextNode.id} - mock (not implemented yet)`);
                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'email_mock',
                    timestamp: new Date().toISOString(),
                    data: { to: nodeData?.config?.to, status: 'mocked' }
                });
            }

            // ==================== QUESTION NODE ====================
            else if (['question', 'pergunta', 'ask_question'].includes(nodeType)) {
                const { instance, contact } = await this.getExecutionContext(execution);

                if (instance?.status === 'connected' && contact) {
                    const provider = this.whatsappFactory.getProvider(instance.provider);
                    const nodeData = nextNode.data as any;
                    const questionText = nodeData?.config?.question || nodeData?.config?.message || 'Qual sua resposta?';
                    const saveTo = nodeData?.config?.saveTo || 'lastAnswer';

                    const res = await provider.sendText(instance.instanceName, contact.phone, questionText);
                    if (res?.messageId) {
                        await this.inboxService.saveMessage({
                            tenantId,
                            instanceId: instance.id,
                            instanceName: instance.instanceName,
                            remoteJid: `${contact.phone}@s.whatsapp.net`,
                            remotePhone: contact.phone,
                            remoteName: contact.name,
                            direction: 'outbound',
                            type: 'text',
                            content: questionText,
                            status: 'sent',
                            wamid: res.messageId,
                            contactId: contact.id,
                        }).catch(err => console.error(`[Flow] Error saving question to inbox:`, err.message));
                    }

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
                    return; // Stop auto-advance — wait for user response
                }
            }

            // ==================== DELAY NODE ====================
            else if (['delay', 'wait', 'esperar'].includes(nodeType)) {
                const nodeData = nextNode.data as any;
                const rawSeconds = nodeData?.config?.seconds || nodeData?.config?.delay || nodeData?.config?.time || '5';
                const delaySeconds = Math.max(1, Math.min(86400, parseInt(String(rawSeconds), 10) || 5)); // Increase max to 24h
                const delayMs = delaySeconds * 1000;

                console.log(`[Flow] ⏳ Delay Node ${nextNode.id}: scheduling resume in ${delaySeconds}s (${delayMs}ms)...`);

                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'delay_started',
                    timestamp: new Date().toISOString(),
                    data: { delaySeconds }
                });

                // Set status to delayed and schedule job
                execution.status = 'delayed';
                execution.nextActionAt = new Date(Date.now() + delayMs);
                await this.executionRepository.save(execution);

                await this.flowQueue.add(
                    'resume',
                    { executionId },
                    {
                        delay: delayMs,
                        jobId: `resume-${executionId}-${nextNode.id}-${Date.now()}`,
                        removeOnComplete: true
                    }
                );

                return; // Stop execution here; the worker will resume it
            }

            // ==================== CONDITION NODE ====================
            else if (['condition'].includes(nodeType)) {
                const nodeData = nextNode.data as any;
                const field = nodeData?.config?.field || '';
                const operator = nodeData?.config?.operator || 'equals';
                const value = nodeData?.config?.value || '';
                const actualValue = execution.variables?.[field] || '';

                let conditionMet = false;
                switch (operator) {
                    case 'equals': conditionMet = String(actualValue) === String(value); break;
                    case 'contains': conditionMet = String(actualValue).includes(String(value)); break;
                    case 'not_equals': conditionMet = String(actualValue) !== String(value); break;
                    case 'starts_with': conditionMet = String(actualValue).startsWith(String(value)); break;
                    case 'gt': conditionMet = Number(actualValue) > Number(value); break;
                    case 'lt': conditionMet = Number(actualValue) < Number(value); break;
                    case 'exists': conditionMet = !!actualValue; break;
                    default: conditionMet = false;
                }

                console.log(`[Flow] Condition node ${nextNode.id}: field=${field}, op=${operator}, expected=${value}, actual=${actualValue}, met=${conditionMet}`);

                // Select the correct output handle (Match frontend ids 'yes'/'no')
                const handleId = conditionMet ? 'yes' : 'no';
                const condEdge = this.findNextEdge(flow.edges, nextNode.id, handleId);

                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'condition_evaluated',
                    timestamp: new Date().toISOString(),
                    data: { field, operator, value, actualValue, conditionMet, nextEdge: condEdge?.id }
                });

                await this.executionRepository.save(execution);

                if (condEdge) {
                    const condNextNode = flow.nodes.find(n => n.id === condEdge.target);
                    if (condNextNode) {
                        execution.currentNodeId = condNextNode.id;
                        await this.executionRepository.save(execution);
                        // FIX: Added missing await — prevents silent race conditions and unhandled rejections
                        await this.processExecution(executionId);
                    }
                } else {
                    console.log(`[Flow] No edge for condition result '${handleId}' at node ${nextNode.id}. Ending.`);
                    execution.status = 'completed';
                    execution.completedAt = new Date();
                    await this.executionRepository.save(execution);
                }
                return;
            }

            // ==================== MULTI-CONDITION NODE ====================
            else if (['multiCondition'].includes(nodeType)) {
                const nodeData = nextNode.data as any;
                const conditions = nodeData?.config?.conditions || [];

                let matchedIndex = -1;
                for (let i = 0; i < conditions.length; i++) {
                    const cond = conditions[i];
                    const actualValue = execution.variables?.[cond.field] || '';
                    let met = false;
                    switch (cond.operator) {
                        case 'equals': met = String(actualValue) === String(cond.value); break;
                        case 'contains': met = String(actualValue).includes(String(cond.value)); break;
                        case 'not_equals': met = String(actualValue) !== String(cond.value); break;
                        case 'starts_with': met = String(actualValue).startsWith(String(cond.value)); break;
                        case 'gt': met = Number(actualValue) > Number(cond.value); break;
                        case 'lt': met = Number(actualValue) < Number(cond.value); break;
                        default: met = false;
                    }
                    if (met) { matchedIndex = i; break; }
                }

                const handleId = matchedIndex >= 0 ? `condition-${matchedIndex}` : 'else';
                console.log(`[Flow] MultiCondition node ${nextNode.id}: matched index=${matchedIndex}, handle=${handleId}`);

                const mcEdge = this.findNextEdge(flow.edges, nextNode.id, handleId);

                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'multi_condition_evaluated',
                    timestamp: new Date().toISOString(),
                    data: { matchedIndex, handleId, nextEdge: mcEdge?.id }
                });

                await this.executionRepository.save(execution);

                if (mcEdge) {
                    const mcNextNode = flow.nodes.find(n => n.id === mcEdge.target);
                    if (mcNextNode) {
                        execution.currentNodeId = mcNextNode.id;
                        await this.executionRepository.save(execution);
                        // FIX: Added missing await — prevents silent race conditions
                        await this.processExecution(executionId);
                    }
                } else {
                    execution.status = 'completed';
                    execution.completedAt = new Date();
                    await this.executionRepository.save(execution);
                }
                return;
            }

            // ==================== WEBHOOK NODE ====================
            else if (['webhook'].includes(nodeType)) {
                const nodeData = nextNode.data as any;
                const webhookUrl = nodeData?.config?.url || '';
                const method = nodeData?.config?.method || 'POST';

                console.log(`[Flow] Webhook node ${nextNode.id}: ${method} ${webhookUrl}`);

                if (webhookUrl) {
                    try {
                        const { instance, contact } = await this.getExecutionContext(execution);
                        const axios = require('axios');
                        const payload = {
                            executionId,
                            flowId: execution.flowId,
                            contactId: execution.contactId,
                            contactPhone: contact?.phone,
                            contactName: contact?.name,
                            variables: execution.variables,
                        };

                        const response = await axios({ method, url: webhookUrl, data: payload, timeout: 10000 });

                        // Store webhook response in variables
                        execution.variables = {
                            ...execution.variables,
                            webhookResponse: response.data,
                        };

                        execution.logs.push({
                            nodeId: nextNode.id,
                            action: 'webhook_called',
                            timestamp: new Date().toISOString(),
                            data: { url: webhookUrl, status: response.status }
                        });
                    } catch (webhookErr) {
                        console.error(`[Flow] Webhook error at node ${nextNode.id}:`, webhookErr.message);
                        execution.logs.push({
                            nodeId: nextNode.id,
                            action: 'webhook_failed',
                            timestamp: new Date().toISOString(),
                            data: { url: webhookUrl, error: webhookErr.message }
                        });
                    }
                } else {
                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'webhook_skipped',
                        timestamp: new Date().toISOString(),
                        data: { reason: 'no_url' }
                    });
                }
            }

            // ==================== TEMPLATE NODES (templateText, templateButton, template) ====================
            else if (['templateText', 'templateButton', 'template'].includes(nodeType)) {
                const { instance, contact } = await this.getExecutionContext(execution);
                const nodeData = nextNode.data as any;
                const templateName = nodeData?.config?.templateName || nodeData?.config?.name || '';
                const templateLanguage = nodeData?.config?.language || 'pt_BR';
                const variables = nodeData?.config?.variables || []; // Array of strings or objects
                const headerUrl = nodeData?.config?.headerUrl || nodeData?.config?.mediaUrl;

                console.log(`[Flow] Template node ${nextNode.id}: template=${templateName}`);

                if (instance?.status === 'connected' && contact && templateName) {
                    try {
                        // Check if instance is official (WABA) and has credentials
                        if (instance.channelType === 'official' && instance.metaConfig?.phoneNumberId && instance.metaConfig?.accessToken) {

                            // Construct Template Components
                            const components: any[] = [];

                            // Header Component (if media url is provided)
                            if (headerUrl) {
                                const resolvedUrl = this.resolveMediaUrl(headerUrl);
                                const mediaType = nodeData?.config?.headerType || 'image'; // image, video, document
                                components.push({
                                    type: 'header',
                                    parameters: [{
                                        type: mediaType,
                                        [mediaType]: { link: resolvedUrl }
                                    }]
                                });
                            }

                            // Body Component (variables)
                            if (variables && variables.length > 0) {
                                const params = variables.map((v: string) => ({
                                    type: 'text',
                                    text: v
                                }));
                                components.push({
                                    type: 'body',
                                    parameters: params
                                });
                            }

                            // Send via Official Meta API
                            const res = await this.metaGraphApiService.sendMessage(
                                instance.metaConfig.phoneNumberId,
                                instance.metaConfig.accessToken,
                                contact.phone,
                                'template',
                                {
                                    name: templateName,
                                    language: { code: templateLanguage },
                                    components
                                }
                            );

                            const messageId = res?.messages?.[0]?.id;
                            if (messageId) {
                                await this.updateCampaignContactMessageId(execution, messageId);
                            }

                            execution.logs.push({
                                nodeId: nextNode.id,
                                action: 'template_sent_waba',
                                timestamp: new Date().toISOString(),
                                data: { templateName, status: 'sent', provider: 'meta', messageId }
                            });

                        } else {
                            // Fallback for non-official instances (Evolution / Waha)
                            // Most providers don't robustly support templates, sending as text fallback
                            const provider = this.whatsappFactory.getProvider(instance.provider);
                            const body = nodeData?.config?.body || `[Template: ${templateName}]`;
                            const res = await provider.sendText(instance.instanceName, contact.phone, body);
                            const messageId = res?.messageId;
                            if (messageId) {
                                await this.updateCampaignContactMessageId(execution, messageId);
                            }

                            execution.logs.push({
                                nodeId: nextNode.id,
                                action: 'template_sent_fallback',
                                timestamp: new Date().toISOString(),
                                data: { templateName, status: 'sent', provider: instance.provider, messageId }
                            });
                        }

                    } catch (tplErr) {
                        console.error(`[Flow] Template send error at node ${nextNode.id}:`, tplErr.message);
                        execution.logs.push({
                            nodeId: nextNode.id,
                            action: 'template_failed',
                            timestamp: new Date().toISOString(),
                            data: { templateName, error: tplErr.message }
                        });
                    }
                } else {
                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'template_skipped',
                        timestamp: new Date().toISOString(),
                        data: { reason: !templateName ? 'no_template' : 'instance_not_connected' }
                    });
                }
            }

            // ==================== SAVE INFO NODE ====================
            else if (['saveInfo'].includes(nodeType)) {
                const nodeData = nextNode.data as any;
                // Support both frontend (fieldName/fieldValue) and backend (field/value) naming
                const field = nodeData?.config?.field || nodeData?.config?.fieldName || '';
                const value = nodeData?.config?.value || nodeData?.config?.fieldValue || '';

                if (field) {
                    execution.variables = { ...execution.variables, [field]: value };
                    console.log(`[Flow] SaveInfo node ${nextNode.id}: saved ${field}=${value}`);
                }

                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'info_saved',
                    timestamp: new Date().toISOString(),
                    data: { field, value }
                });
            }

            // ==================== LIMIT EXECUTION NODE ====================
            else if (['limitExecution'].includes(nodeType)) {
                const nodeData = nextNode.data as any;
                const maxExecutions = parseInt(nodeData?.config?.maxExecutions || '1', 10);
                const period = nodeData?.config?.period || 'ever'; // 'ever', 'day', 'hour'

                // Count actual executions from DB
                let countQuery = this.executionRepository.createQueryBuilder('exec')
                    .where('exec.flowId = :flowId', { flowId: execution.flowId })
                    .andWhere('exec.contactId = :contactId', { contactId: execution.contactId })
                    .andWhere('exec.id != :currentId', { currentId: executionId });

                if (period === 'day') {
                    const dayStart = new Date();
                    dayStart.setHours(0, 0, 0, 0);
                    countQuery = countQuery.andWhere('exec.startedAt >= :dayStart', { dayStart });
                } else if (period === 'hour') {
                    const hourStart = new Date(Date.now() - 3600000);
                    countQuery = countQuery.andWhere('exec.startedAt >= :hourStart', { hourStart });
                }

                const executionCount = await countQuery.getCount();
                const passed = executionCount < maxExecutions;

                console.log(`[Flow] LimitExecution node ${nextNode.id}: max=${maxExecutions}, period=${period}, currentCount=${executionCount}, passed=${passed}`);

                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'limit_checked',
                    timestamp: new Date().toISOString(),
                    data: { maxExecutions, period, currentCount: executionCount, passed }
                });

                if (!passed) {
                    // Limit reached — stop execution
                    execution.status = 'completed';
                    execution.completedAt = new Date();
                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'limit_reached',
                        timestamp: new Date().toISOString(),
                        data: { maxExecutions, period, executionCount }
                    });
                    await this.executionRepository.save(execution);
                    console.log(`[Flow] ⛔ Execution stopped by limitExecution: ${executionCount}/${maxExecutions} (${period})`);
                    return;
                }
            }

            // ==================== MOVE FLOW NODE ====================
            else if (['moveFlow'].includes(nodeType)) {
                const nodeData = nextNode.data as any;
                const targetFlowId = nodeData?.config?.flowId || nodeData?.config?.targetFlowId || nodeData?.config?.targetFlow || '';

                console.log(`[Flow] MoveFlow node ${nextNode.id}: target flow=${targetFlowId}`);

                if (targetFlowId) {
                    // Complete current execution
                    execution.status = 'completed';
                    execution.completedAt = new Date();
                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'moved_to_flow',
                        timestamp: new Date().toISOString(),
                        data: { targetFlowId }
                    });
                    await this.executionRepository.save(execution);

                    // Start new execution in target flow
                    try {
                        const tenantId = (await this.flowRepository.findOne({ where: { id: execution.flowId } }))?.tenantId;
                        if (tenantId) {
                            await this.startExecution(tenantId, {
                                flowId: targetFlowId,
                                contactId: execution.contactId,
                                instanceId: execution.instanceId,
                                initialVariables: execution.variables,
                            });
                        }
                    } catch (moveErr) {
                        console.error(`[Flow] MoveFlow error:`, moveErr.message);
                    }
                    return;
                } else {
                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'move_flow_skipped',
                        timestamp: new Date().toISOString(),
                        data: { reason: 'no_target_flow' }
                    });
                }
            }

            // ==================== AI NODES (ChatGPT, Gemini, etc) ====================
            else if (['openai', 'chatgpt', 'gemini', 'llama', 'anthropic', 'groq', 'customLlm'].includes(nodeType)) {
                const { instance, contact } = await this.getExecutionContext(execution);
                const nodeData = nextNode.data as any;
                const token = nodeData?.config?.token || nodeData?.config?.apiKey || '';
                const prompt = nodeData?.config?.prompt || nodeData?.config?.systemPrompt || 'Você é um assistente virtual útil.';
                const userMessage = execution.variables?.lastAnswer || 'Olá';

                console.log(`[Flow] AI node ${nextNode.id}: type=${nodeType}, promptLength=${prompt.length}`);

                if (token && contact) {
                    try {
                        const providerMap: any = {
                            'openai': 'openai',
                            'chatgpt': 'openai',
                            'anthropic': 'anthropic',
                        };
                        const aiProvider = providerMap[nodeType] || 'openai';

                        const response = await this.aiService.generateResponseWithKey(
                            prompt,
                            userMessage,
                            token,
                            aiProvider
                        );

                        // Save response to variables
                        execution.variables = {
                            ...execution.variables,
                            [`${nodeType}Response`]: response,
                            lastAiResponse: response,
                        };

                        // Auto-send response if configured (default to true for simple nodes)
                        if (nodeData?.config?.autoSend !== false && instance?.status === 'connected') {
                            const whatsappProvider = this.whatsappFactory.getProvider(instance.provider);
                            await whatsappProvider.sendText(instance.instanceName, contact.phone, response);
                        }

                        execution.logs.push({
                            nodeId: nextNode.id,
                            action: 'ai_response_generated',
                            timestamp: new Date().toISOString(),
                            data: { type: nodeType, status: 'success' }
                        });
                    } catch (aiErr) {
                        console.error(`[Flow] AI Error at node ${nextNode.id}:`, aiErr.message);
                        execution.logs.push({
                            nodeId: nextNode.id,
                            action: 'ai_failed',
                            timestamp: new Date().toISOString(),
                            data: { error: aiErr.message }
                        });
                    }
                } else {
                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'ai_skipped',
                        timestamp: new Date().toISOString(),
                        data: { reason: !token ? 'no_token' : 'no_contact' }
                    });
                }
            }

            // ==================== RANDOMIZER NODE ====================
            else if (['randomizer'].includes(nodeType)) {
                const outEdges = flow.edges.filter(e => e.source === nextNode.id);
                if (outEdges.length > 0) {
                    const nodeData = nextNode.data as any;
                    const configPaths: Array<{ name: string; weight: number }> = nodeData?.config?.paths || [];

                    let selectedEdge: any;
                    let selectedIndex: number;
                    let selectionMethod: string;
                    let weightsUsed: string;

                    // Check if we have valid weights configured
                    const hasWeights = configPaths.length > 0 && configPaths.some(p => p.weight > 0);

                    if (hasWeights) {
                        // === WEIGHTED RANDOM SELECTION ===
                        // Build a weight map: sourceHandle "path-{idx}" → weight from configPaths[idx]
                        const edgesWithWeights = outEdges.map(edge => {
                            let pathIndex = -1;
                            if (edge.sourceHandle && edge.sourceHandle.startsWith('path-')) {
                                pathIndex = parseInt(edge.sourceHandle.replace('path-', ''), 10);
                            }
                            const weight = (pathIndex >= 0 && pathIndex < configPaths.length)
                                ? Math.max(0, configPaths[pathIndex].weight || 0)
                                : 0;
                            return { edge, pathIndex, weight };
                        });

                        const totalWeight = edgesWithWeights.reduce((sum, ew) => sum + ew.weight, 0);

                        if (totalWeight > 0) {
                            // Weighted selection: pick a random number in [0, totalWeight) and find the matching path
                            const rand = Math.random() * totalWeight;
                            let cumulative = 0;
                            let chosen = edgesWithWeights[0]; // fallback
                            for (const ew of edgesWithWeights) {
                                cumulative += ew.weight;
                                if (rand < cumulative) {
                                    chosen = ew;
                                    break;
                                }
                            }
                            selectedEdge = chosen.edge;
                            selectedIndex = chosen.pathIndex;
                            selectionMethod = 'weighted';
                            weightsUsed = edgesWithWeights.map(ew => `path-${ew.pathIndex}:${ew.weight}%`).join(', ');
                        } else {
                            // All weights are 0 — fall back to uniform
                            selectedIndex = Math.floor(Math.random() * outEdges.length);
                            selectedEdge = outEdges[selectedIndex];
                            selectionMethod = 'uniform (all weights zero)';
                            weightsUsed = 'none';
                        }
                    } else {
                        // === UNIFORM RANDOM (no weights configured) ===
                        selectedIndex = Math.floor(Math.random() * outEdges.length);
                        selectedEdge = outEdges[selectedIndex];
                        selectionMethod = 'uniform (no config)';
                        weightsUsed = 'none';
                    }

                    const pathName = (selectedIndex >= 0 && selectedIndex < configPaths.length)
                        ? configPaths[selectedIndex].name
                        : `path-${selectedIndex}`;

                    console.log(`[Flow] 🎲 Randomizer node ${nextNode.id}: [${selectionMethod}] selected "${pathName}" (index ${selectedIndex}) -> ${selectedEdge.target} | weights: [${weightsUsed}]`);

                    execution.logs.push({
                        nodeId: nextNode.id,
                        action: 'randomizer_selected',
                        timestamp: new Date().toISOString(),
                        data: {
                            totalPaths: outEdges.length,
                            selectedIndex,
                            selectedPath: pathName,
                            selectionMethod,
                            weights: configPaths.map(p => ({ name: p.name, weight: p.weight })),
                        }
                    });

                    const rNextNode = flow.nodes.find(n => n.id === selectedEdge.target);
                    if (rNextNode) {
                        execution.currentNodeId = rNextNode.id;
                        await this.executionRepository.save(execution);
                        // FIX: Added missing await — prevents silent race conditions
                        await this.processExecution(executionId);
                    }
                } else {
                    execution.status = 'completed';
                    execution.completedAt = new Date();
                    await this.executionRepository.save(execution);
                }
                return;
            }

            // ==================== FAKE CALL NODE ====================
            else if (['fakeCall'].includes(nodeType)) {
                const { instance, contact } = await this.getExecutionContext(execution);

                console.log(`[Flow] FakeCall node ${nextNode.id}: simulating call to ${contact?.phone}`);
                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'fake_call_simulated',
                    timestamp: new Date().toISOString(),
                    data: { phone: contact?.phone, status: 'simulated' }
                });
            }

            // ==================== CONTACTS NODE ====================
            else if (['contacts'].includes(nodeType)) {
                const nodeData = nextNode.data as any;
                const action = nodeData?.config?.action || 'addTag';
                const tagName = nodeData?.config?.tag || nodeData?.config?.tagName || '';
                const tagIds = nodeData?.config?.tagIds || [];

                console.log(`[Flow] Contacts node ${nextNode.id}: action=${action}, tag=${tagName}, tagIds=${JSON.stringify(tagIds)}`);

                try {
                    if (execution.contactId) {
                        const tenantId = (await this.flowRepository.findOne({ where: { id: execution.flowId } }))?.tenantId;
                        if (tenantId) {
                            if (action === 'addTag' && tagIds.length > 0) {
                                await this.contactsService.addTagsToContact(execution.contactId, tagIds);
                                console.log(`[Flow] ✅ Added ${tagIds.length} tags to contact ${execution.contactId}`);
                            } else if (action === 'addTag' && tagName) {
                                // Find or create tag by name, then add
                                const existingTags = await this.contactsService.findAllTags(tenantId);
                                let tag = existingTags.find((t: any) => t.name === tagName);
                                if (!tag) {
                                    tag = await this.contactsService.createTag(tenantId, { name: tagName });
                                }
                                await this.contactsService.addTagsToContact(execution.contactId, [tag.id]);
                                console.log(`[Flow] ✅ Added tag "${tagName}" to contact ${execution.contactId}`);
                            } else if (action === 'removeTag' && tagIds.length > 0) {
                                await this.contactsService.bulkRemoveTags(tenantId, {
                                    contactIds: [execution.contactId],
                                    tagIds,
                                });
                                console.log(`[Flow] ✅ Removed ${tagIds.length} tags from contact ${execution.contactId}`);
                            } else if (action === 'block') {
                                await this.contactsService.blockContact(tenantId, execution.contactId);
                                console.log(`[Flow] 🚫 Contact ${execution.contactId} blocked`);
                            } else if (action === 'unblock') {
                                await this.contactsService.unblockContact(tenantId, execution.contactId);
                                console.log(`[Flow] 🔓 Contact ${execution.contactId} unblocked`);
                            } else if (action === 'optOut') {
                                await this.contactsService.setOptOut(tenantId, execution.contactId, true);
                                console.log(`[Flow] 🚪 Contact ${execution.contactId} marked as opt-out`);
                            } else if (action === 'changeCategory') {
                                const newCategory = nodeData?.config?.categoryName || nodeData?.config?.category || '';
                                if (newCategory) {
                                    await this.contactsService.updateContact(tenantId, execution.contactId, {
                                        category: newCategory
                                    });
                                    console.log(`[Flow] 🏷️ Contact ${execution.contactId} category changed to ${newCategory}`);
                                }
                            }
                        }
                    }
                } catch (tagErr) {
                    console.error(`[Flow] Tag operation error at node ${nextNode.id}:`, tagErr.message);
                }

                execution.logs.push({
                    nodeId: nextNode.id,
                    action: `contacts_${action}`,
                    timestamp: new Date().toISOString(),
                    data: { action, tagName, tagIds, status: 'executed' }
                });
            }

            // ==================== START NODE (skip) ====================
            else if (nodeType === 'start') {
                console.log(`[Flow] Start node ${nextNode.id}: skipping (already started)`);
                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'start_passed',
                    timestamp: new Date().toISOString(),
                });
            }

            // ==================== UNKNOWN NODE TYPE ====================
            else {
                console.warn(`[Flow] Unknown node type at ${nextNode.id}: "${nodeType}" — passing through`);
                execution.logs.push({
                    nodeId: nextNode.id,
                    action: 'unknown_passthrough',
                    timestamp: new Date().toISOString(),
                    data: { type: nodeType }
                });
            }

            // ==================== FINALIZE & ADVANCE ====================
            await this.executionRepository.save(execution);

            if (nodeType === 'end') {
                execution.status = 'completed';
                execution.completedAt = new Date();
                await this.executionRepository.save(execution);
                console.log(`[Flow] [${executionId.slice(0, 8)}] ✅ Flow completed at end node ${nextNode.id}`);
                return;
            }

            // Continue to next node (await to propagate errors properly)
            console.log(`[Flow] [${executionId.slice(0, 8)}] → Advancing from ${nextNode.id} to next...`);
            await this.processExecution(executionId);

        } catch (error) {
            console.error(`[Flow] Error processing node ${nextNode.id} (type: ${nodeType}):`, error);
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

    // ============ TESTING ============

    async testFlow(tenantId: string, flowId: string, phone: string, instanceId?: string) {
        // Encontra o fluxo e os gatilhos para validar
        await this.findById(tenantId, flowId);

        // Instância conectada
        const instance = await this.instancesService.findConnected(tenantId);
        if (!instance) {
            throw new BadRequestException('Nenhuma instância conectada para envio.');
        }

        const targetInstanceId = instanceId || instance.id;

        // Buscar ou Criar Contato de Teste
        let contact = await this.contactsService.findByPhone(tenantId, phone);
        if (!contact) {
            console.log(`[TestFlow] Creating test contact for ${phone}`);
            contact = await this.contactsService.createContact(tenantId, {
                name: `Teste Fluxo ${phone.slice(-4)}`,
                phone: phone
            });
        }

        if (!contact) {
            throw new BadRequestException('Erro ao criar ou encontrar contato de teste.');
        }

        // Executar
        const execution = await this.startExecution(tenantId, {
            flowId,
            contactId: contact.id,
            instanceId: targetInstanceId,
            initialVariables: { isTest: true }
        });

        if (!execution) {
            throw new BadRequestException('Erro ao iniciar execução de teste.');
        }

        return {
            message: 'Teste iniciado com sucesso',
            executionId: execution.id,
            contactName: contact.name,
            instanceName: instance.instanceName
        };
    }

    async resumeExecution(executionId: string) {
        const execution = await this.executionRepository.findOne({ where: { id: executionId } });
        if (!execution) {
            console.warn(`[Flow] Cannot resume execution ${executionId} - not found`);
            return;
        }

        // Se estiver delayed ou waiting, reseta
        execution.status = 'running';
        execution.nextActionAt = null;
        await this.executionRepository.save(execution);
        console.log(`[Flow] Resuming execution ${executionId}`);

        return this.processExecution(executionId);
    }

    // ============ HELPERS ============

    private isWithinBusinessHours(config: any): boolean {
        if (!config || !config.enabled || !config.days) return true;

        const now = new Date();
        const daysMap: Record<number, string> = {
            0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
        };

        const currentDayId = daysMap[now.getDay()];
        const dayConfig = config.days.find((d: any) => d.id === currentDayId);

        if (!dayConfig) return false; // Closed today

        const [startH, startM] = dayConfig.start.split(':').map(Number);
        const [endH, endM] = dayConfig.end.split(':').map(Number);

        const currentH = now.getHours();
        const currentM = now.getMinutes();

        const currentTime = currentH * 60 + currentM;
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;

        return currentTime >= startTime && currentTime <= endTime;
    }

    async checkFlowTriggers(tenantId: string, instanceId: string, contactId: string, message: string) {
        const activeFlows = await this.flowRepository.find({
            where: { tenantId, status: 'active' }
        });

        const normalizedMsg = message.toLowerCase().trim();

        for (const flow of activeFlows) {
            const startNode = flow.nodes.find(n => n.data.type === 'start');
            if (!startNode) continue;

            const triggers = startNode.data.config?.triggers || [];
            const hasMatch = triggers.some((t: any) => {
                if (t.type === 'keyword') {
                    const val = t.value.toLowerCase().trim();
                    if (t.match === 'exact') return normalizedMsg === val;
                    if (t.match === 'contains') return normalizedMsg.includes(val);
                    if (t.match === 'starts_with') return normalizedMsg.startsWith(val);
                }
                return false;
            });

            if (hasMatch) {
                // FIX: Check for existing active execution to prevent duplicate triggers
                // when a contact sends multiple messages rapidly
                const existingExecution = await this.executionRepository
                    .createQueryBuilder('exec')
                    .where('exec.flowId = :flowId', { flowId: flow.id })
                    .andWhere('exec.contactId = :contactId', { contactId })
                    .andWhere("exec.status IN ('running', 'waiting_response', 'delayed')")
                    .getOne();

                if (existingExecution) {
                    console.log(`[Flow] Trigger skipped for flow "${flow.name}" — contact already has active execution ${existingExecution.id.slice(0, 8)} (status: ${existingExecution.status})`);
                    continue;
                }

                console.log(`[Flow] Trigger matched for flow "${flow.name}" with message: "${message}"`);
                // Start execution
                return this.startExecution(tenantId, {
                    flowId: flow.id,
                    contactId,
                    instanceId,
                    initialVariables: { triggerMessage: message }
                });
            }
        }

        return null;
    }
}
