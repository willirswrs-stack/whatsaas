import api from './api';

// ============ TYPES ============

export type FlowNodeType =
    | 'start'
    | 'message'
    | 'media'
    | 'delay'
    | 'buttons'
    | 'question'
    | 'condition'
    | 'addTag'
    | 'removeTag'
    | 'updateField'
    | 'gpt'
    | 'end';

export interface FlowNodeData {
    label: string;
    type: FlowNodeType;
    config: Record<string, any>;
}

export interface FlowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: FlowNodeData;
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
}

export interface Flow {
    id: string;
    name: string;
    description?: string;
    channel?: string;
    status: 'draft' | 'active' | 'paused' | 'archived';
    folderId?: string | null;
    nodes: FlowNode[];
    edges: FlowEdge[];
    executionCount: number;
    lastExecutedAt?: string;
    triggers?: FlowTrigger[];
    createdAt: string;
    updatedAt: string;
}

export interface FlowTrigger {
    id: string;
    flowId: string;
    type: 'keyword' | 'any_message' | 'webhook' | 'schedule' | 'manual';
    config: {
        keywords?: string[];
        matchType?: 'exact' | 'contains' | 'starts_with';
        webhookKey?: string;
        cronExpression?: string;
    };
    active: boolean;
    createdAt: string;
}

export interface FlowExecution {
    id: string;
    flowId: string;
    contactId: string;
    instanceId?: string;
    status: 'running' | 'completed' | 'failed' | 'paused';
    currentNodeId?: string;
    variables: Record<string, any>;
    logs: Array<{
        nodeId: string;
        action: string;
        timestamp: string;
        data?: Record<string, any>;
    }>;
    startedAt: string;
    completedAt?: string;
}

export interface FlowStats {
    totalFlows: number;
    active: number;
    draft: number;
    paused: number;
    totalExecutions: number;
    topFlows: Array<{ id: string; name: string; executions: number }>;
}

export interface FlowFolder {
    id: string;
    name: string;
    description?: string;
    parentId?: string;
    archived: boolean;
    order: number;
    createdAt: string;
    updatedAt: string;
}

// ============ FOLDERS API ============

export const foldersApi = {
    async getFolders(includeArchived = false): Promise<FlowFolder[]> {
        const response = await api.get(`/folders${includeArchived ? '?archived=true' : ''}`);
        return response.data;
    },

    async getFolder(id: string): Promise<FlowFolder> {
        const response = await api.get(`/folders/${id}`);
        return response.data;
    },

    async getArchivedFolders(): Promise<FlowFolder[]> {
        const response = await api.get('/folders/archived');
        return response.data;
    },

    async createFolder(data: { name: string; description?: string; parentId?: string }): Promise<FlowFolder> {
        const response = await api.post('/folders', data);
        return response.data;
    },

    async updateFolder(id: string, data: Partial<FlowFolder>): Promise<FlowFolder> {
        const response = await api.put(`/folders/${id}`, data);
        return response.data;
    },

    async deleteFolder(id: string): Promise<void> {
        await api.delete(`/folders/${id}`);
    },

    async archiveFolder(id: string): Promise<FlowFolder> {
        const response = await api.post(`/folders/${id}/archive`);
        return response.data;
    },

    async unarchiveFolder(id: string): Promise<FlowFolder> {
        const response = await api.post(`/folders/${id}/unarchive`);
        return response.data;
    },
};

// ============ FLOWS API ============

export const flowsApi = {
    // Flows
    async getFlows(): Promise<Flow[]> {
        const response = await api.get('/flows');
        return response.data;
    },

    async getFlow(id: string): Promise<Flow> {
        const response = await api.get(`/flows/${id}`);
        return response.data;
    },

    async createFlow(data: { name: string; description?: string; channel?: string }): Promise<Flow> {
        const response = await api.post('/flows', data);
        return response.data;
    },

    async updateFlow(id: string, data: Partial<Flow>): Promise<Flow> {
        const response = await api.put(`/flows/${id}`, data);
        return response.data;
    },

    async deleteFlow(id: string): Promise<void> {
        await api.delete(`/flows/${id}`);
    },

    async duplicateFlow(id: string): Promise<Flow> {
        const response = await api.post(`/flows/${id}/duplicate`);
        return response.data;
    },

    async activateFlow(id: string): Promise<Flow> {
        const response = await api.post(`/flows/${id}/activate`);
        return response.data;
    },

    async pauseFlow(id: string): Promise<Flow> {
        const response = await api.post(`/flows/${id}/pause`);
        return response.data;
    },

    async getStats(): Promise<FlowStats> {
        const response = await api.get('/flows/stats');
        return response.data;
    },

    // Triggers
    async createTrigger(flowId: string, data: Omit<FlowTrigger, 'id' | 'flowId' | 'createdAt'>): Promise<FlowTrigger> {
        const response = await api.post(`/flows/${flowId}/triggers`, data);
        return response.data;
    },

    async updateTrigger(triggerId: string, data: Partial<FlowTrigger>): Promise<FlowTrigger> {
        const response = await api.put(`/flows/triggers/${triggerId}`, data);
        return response.data;
    },

    async deleteTrigger(triggerId: string): Promise<void> {
        await api.delete(`/flows/triggers/${triggerId}`);
    },

    // Executions
    async getExecutions(flowId?: string): Promise<FlowExecution[]> {
        const params = flowId ? `?flowId=${flowId}` : '';
        const response = await api.get(`/flows/executions/list${params}`);
        return response.data;
    },

    async executeFlow(flowId: string, contactId: string, instanceId?: string): Promise<FlowExecution> {
        const response = await api.post('/flows/execute', { flowId, contactId, instanceId });
        return response.data;
    },
};

// ============ NODE DEFINITIONS ============

export const NODE_CATEGORIES = [
    {
        id: 'messages',
        label: 'Mensagens',
        nodes: [
            { type: 'message', label: 'Texto', icon: '💬', color: '#14b8a6' },
            { type: 'question', label: 'Pergunta', icon: '❓', color: '#14b8a6' },
            { type: 'link', label: 'Link', icon: '🔗', color: '#3b82f6' },
        ],
    },
    {
        id: 'templates',
        label: 'Templates Meta',
        nodes: [
            { type: 'templateText', label: 'Template de texto', icon: '📝', color: '#8b5cf6' },
            { type: 'templateButton', label: 'Template com botão', icon: '🔘', color: '#8b5cf6' },
        ],
    },
    {
        id: 'media',
        label: 'Mídias',
        nodes: [
            { type: 'video', label: 'Vídeo', icon: '🎬', color: '#ef4444' },
            { type: 'image', label: 'Imagem', icon: '🖼️', color: '#22c55e' },
            { type: 'sticker', label: 'Sticker', icon: '😀', color: '#f59e0b' },
            { type: 'audio', label: 'Áudio', icon: '🎵', color: '#ec4899' },
            { type: 'document', label: 'Documento', icon: '📄', color: '#6366f1' },
        ],
    },
    {
        id: 'buttons',
        label: 'Botões',
        nodes: [
            { type: 'buttonsDefault', label: 'Padrão', icon: '🔲', color: '#14b8a6' },
            { type: 'buttonsCopy', label: 'Copia e Cola', icon: '📋', color: '#f97316' },
            { type: 'buttonsActions', label: 'Ações', icon: '⚡', color: '#a855f7' },
        ],
    },
    {
        id: 'integrations',
        label: 'Integrações IA',
        nodes: [
            { type: 'webhook', label: 'Chamada externa', icon: '🌐', color: '#06b6d4' },
            { type: 'openai', label: 'ChatGPT', icon: '✨', color: '#10b981' },
            { type: 'anthropic', label: 'Claude', icon: '🧠', color: '#f97316' },
            { type: 'gemini', label: 'Gemini', icon: '💎', color: '#3b82f6' },
            { type: 'groq', label: 'Groq/Llama', icon: '⚡', color: '#06b6d4' },
            { type: 'customLlm', label: 'LLM Customizada', icon: '🔧', color: '#6366f1' },
        ],
    },
    {
        id: 'channels',
        label: 'Canais',
        nodes: [
            { type: 'sms', label: 'SMS', icon: '📲', color: '#22C55E' },
            { type: 'email', label: 'Email', icon: '📧', color: '#EA4335' },
        ],
    },
    {
        id: 'actions',
        label: 'Ações',
        nodes: [
            { type: 'limitExecution', label: 'Limitar execução', icon: '🚫', color: '#ef4444' },
            { type: 'saveInfo', label: 'Gravar info', icon: '💾', color: '#3b82f6' },
            { type: 'delay', label: 'Intervalo', icon: '⏱️', color: '#f59e0b' },
            { type: 'condition', label: 'Condição', icon: '🔀', color: '#f97316' },
            { type: 'multiCondition', label: 'Multi condição', icon: '🔀', color: '#ec4899' },
            { type: 'moveFlow', label: 'Mover de fluxo', icon: '↗️', color: '#8b5cf6' },
            { type: 'randomizer', label: 'Randomizer', icon: '🎲', color: '#22c55e' },
            { type: 'fakeCall', label: 'Fake Call', icon: '📞', color: '#14b8a6' },
            { type: 'contacts', label: 'Contatos', icon: '👥', color: '#6366f1' },
        ],
    },
];

export const getNodeColor = (type: FlowNodeType): string => {
    const colors: Record<FlowNodeType, string> = {
        start: '#14b8a6',
        message: '#22c55e',
        media: '#3b82f6',
        delay: '#f59e0b',
        buttons: '#8b5cf6',
        question: '#14b8a6',
        condition: '#f97316',
        addTag: '#a855f7',
        removeTag: '#ec4899',
        updateField: '#06b6d4',
        gpt: '#10b981',
        end: '#ef4444',
    };
    return colors[type] || '#6b7280';
};

export default flowsApi;
