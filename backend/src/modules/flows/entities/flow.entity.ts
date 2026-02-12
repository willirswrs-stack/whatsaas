import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

// Tipos de nós disponíveis
export type FlowNodeType =
    | 'start'           // Nó inicial
    | 'message'         // Enviar mensagem de texto
    | 'media'           // Enviar mídia (imagem, vídeo, áudio, documento)
    | 'link'            // Enviar link
    | 'image'           // Enviar imagem
    | 'video'           // Enviar vídeo
    | 'audio'           // Enviar áudio
    | 'document'        // Enviar documento
    | 'delay'           // Aguardar intervalo
    | 'buttons'         // Mensagem com botões
    | 'question'        // Fazer pergunta e salvar resposta
    | 'condition'       // Condicional (if/else)
    | 'addTag'          // Adicionar tag ao contato
    | 'removeTag'       // Remover tag do contato
    | 'updateField'     // Atualizar campo do contato
    | 'gpt'             // Integração ChatGPT
    | 'end';            // Nó final

// Configuração de cada tipo de nó
export interface NodeData {
    label: string;
    type: FlowNodeType;
    config: Record<string, any>;
}

// Estrutura de uma conexão entre nós
export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
}

// Estrutura de um nó no fluxo
export interface FlowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: NodeData;
}

@Entity('flows')
export class Flow {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ name: 'folder_id', type: 'uuid', nullable: true })
    folderId: string | null;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    channel: string;

    @Column({ type: 'varchar', length: 20, default: 'draft' })
    status: 'draft' | 'active' | 'paused' | 'archived';

    // Estrutura visual do fluxo (React Flow)
    @Column({ type: 'jsonb', default: [] })
    nodes: FlowNode[];

    @Column({ type: 'jsonb', default: [] })
    edges: FlowEdge[];

    // Estatísticas
    @Column({ name: 'execution_count', type: 'int', default: 0 })
    executionCount: number;

    @Column({ name: 'last_executed_at', type: 'timestamp', nullable: true })
    lastExecutedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('flow_executions')
export class FlowExecution {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'flow_id', type: 'uuid' })
    flowId: string;

    @Column({ name: 'contact_id', type: 'uuid' })
    contactId: string;

    @Column({ name: 'instance_id', type: 'uuid', nullable: true })
    instanceId: string;

    @Column({ type: 'varchar', length: 30, default: 'running' })
    status: 'running' | 'completed' | 'failed' | 'paused' | 'waiting_response';

    @Column({ name: 'current_node_id', type: 'varchar', length: 100, nullable: true })
    currentNodeId: string;

    // Variáveis do fluxo (respostas coletadas, etc)
    @Column({ type: 'jsonb', default: {} })
    variables: Record<string, any>;

    // Log de execução
    @Column({ type: 'jsonb', default: [] })
    logs: Array<{
        nodeId: string;
        action: string;
        timestamp: string;
        data?: Record<string, any>;
    }>;

    @Column({ name: 'started_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    startedAt: Date;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date;

    @Column({ name: 'next_action_at', type: 'timestamp', nullable: true })
    nextActionAt: Date; // Para delays
}

@Entity('flow_triggers')
export class FlowTrigger {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'flow_id', type: 'uuid' })
    flowId: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId: string;

    @Column({ type: 'varchar', length: 50 })
    type: 'keyword' | 'any_message' | 'webhook' | 'schedule' | 'manual';

    // Para keyword: palavras-chave, Para schedule: cron expression
    @Column({ type: 'jsonb', default: {} })
    config: {
        keywords?: string[];
        matchType?: 'exact' | 'contains' | 'starts_with';
        webhookKey?: string;
        cronExpression?: string;
    };

    @Column({ type: 'boolean', default: true })
    active: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
