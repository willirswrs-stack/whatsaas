import api from './api';

// Tipos
export interface SpinRequest {
    content: string;
    variations: number;
    creativity: number;
}

export interface SpinResponse {
    variations: string[];
}

export interface WarmupScriptRequest {
    topics: string[];
    messageCount: number;
}

export interface WarmupMessage {
    sender: 'A' | 'B';
    type: 'text' | 'audio' | 'sticker';
    content?: string;
    duration?: number;
}

export interface WarmupScriptResponse {
    conversation: WarmupMessage[];
}

// Serviços de IA
export const aiService = {
    async spinContent(data: SpinRequest): Promise<SpinResponse> {
        const response = await api.post<SpinResponse>('/ai/spin', data);
        return response.data;
    },

    async generateWarmupScript(data: WarmupScriptRequest): Promise<WarmupScriptResponse> {
        const response = await api.post<WarmupScriptResponse>('/ai/warmup-script', data);
        return response.data;
    },
};
