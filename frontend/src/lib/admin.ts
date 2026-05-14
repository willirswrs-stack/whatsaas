import api from './api';

export interface AdminStats {
    totalTenants: number;
    totalUsers: number;
    totalInstances: number;
    instancesOnline: number;
    totalCampaigns: number;
    totalProxies: number;
    totalMessagesTraffic: number;
    aiTokensConsumed: number;
    clonedVoices: number;
    proxyRotationHealth: number;
    features: Record<string, boolean>;
    server: {
        platform: string;
        uptime: number;
        memoryTotal: number;
        memoryFree: number;
        cpuCount: number;
    };
}

export interface AdminLog {
    timestamp: string;
    level: string;
    message: string;
    context?: string;
}

export const adminService = {
    async getStats(): Promise<AdminStats> {
        const { data } = await api.get('/admin/stats');
        return data;
    },

    async getTenants(): Promise<any[]> {
        const { data } = await api.get('/admin/tenants');
        return data;
    },

    async updateTenantStatus(tenantId: string, status: string): Promise<any> {
        const { data } = await api.patch(`/admin/tenants/${tenantId}/status`, { status });
        return data;
    },

    async getTenantDetail(id: string): Promise<any> {
        const { data } = await api.get(`/admin/tenants/${id}`);
        return data;
    },

    async updateTenant(id: string, payload: any): Promise<any> {
        const { data } = await api.patch(`/admin/tenants/${id}`, payload);
        return data;
    },

    async updateTenantPlan(id: string, payload: any): Promise<any> {
        const { data } = await api.patch(`/admin/tenants/${id}/plan`, payload);
        return data;
    },

    async createTenant(payload: any): Promise<any> {
        const { data } = await api.post('/admin/tenants', payload);
        return data;
    },

    async getPlans(): Promise<any[]> {
        const { data } = await api.get('/admin/plans');
        return data;
    },

    async getLogs(): Promise<AdminLog[]> {
        const { data } = await api.get('/admin/logs');
        return data;
    },

    async toggleFeature(name: string, status: boolean): Promise<any> {
        const { data } = await api.post('/admin/features/toggle', { name, status });
        return data;
    }
};
