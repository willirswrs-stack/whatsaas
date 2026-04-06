import api from './api';

export interface WarmupInstanceWrapper {
    id: string;
    phone: string;
    day: number;
    dailyLimit: number;
    sent: number;
    status: string;
    health: number;
}

export interface WarmupStats {
    activeChips: number;
    totalMessagesSent: number;
    avgHealth: number;
    instances: WarmupInstanceWrapper[];
}

export interface WarmupScheduleItem {
    day: number;
    limit: number;
    interval: number;
}

export const warmupService = {
    getSchedule: async (): Promise<WarmupScheduleItem[]> => {
        const response = await api.get('/warmup/schedule');
        return response.data;
    },

    getStats: async (): Promise<WarmupStats> => {
        const response = await api.get('/warmup/stats');
        return response.data;
    },

    async createSession(instAId?: string, instBId?: string): Promise<any> {
        const response = await api.post('/warmup/session', { instAId, instBId });
        return response.data;
    }
};
