/**
 * Anti-Ban Service - Frontend
 * 
 * Handles API calls to the Anti-Ban backend module
 */
import api from '../lib/api';

export interface DashboardData {
    overview: {
        totalMessagesSent24h: number;
        overallDeliveryRate: number;
        activeInstances: number;
        activeCampaigns: number;
        healthyChips: number;
        atRiskChips: number;
    };
    hourlyVolume: Array<{ hour: number; count: number }>;
    stackPerformance: Array<{
        stack: string;
        successRate: number;
        averageLatencyMs: number;
        totalMessages: number;
    }>;
    recentAlerts: Array<{
        id: string;
        type: string;
        severity: 'info' | 'warning' | 'critical';
        message: string;
        detectedAt: string;
    }>;
    healthTrends: Array<{
        instanceId: string;
        trend: 'up' | 'down' | 'stable';
        prediction: number;
    }>;
}

export const antibanService = {
    getDashboardData: async (): Promise<DashboardData> => {
        const response = await api.get('/analytics/dashboard');
        return response.data;
    },

    getInstancesMetrics: async () => {
        const response = await api.get('/analytics/instances');
        return response.data;
    },

    getRecentAlerts: async () => {
        const response = await api.get('/analytics/alerts');
        return response.data;
    },

    getInstanceHealth: async (instanceId: string) => {
        const response = await api.get(`/analytics/instances/${instanceId}/health`);
        return response.data;
    }
};
