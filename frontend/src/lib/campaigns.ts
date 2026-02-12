import api from './api';

// Tipos
export interface Campaign {
    id: string;
    name: string;
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
    templateId?: string;
    flowId?: string;
    instanceId?: string;
    totalContacts: number;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
}

export interface CreateCampaignDto {
    name: string;
    templateId?: string;
    flowId?: string;
    instanceId?: string;
    contactIds?: string[];
    segmentId?: string;
    scheduledAt?: string;
    aiSpinEnabled?: boolean;
    variationCount?: number;
    minDelaySec?: number;
    maxDelaySec?: number;
    settings?: {
        greetingStyle?: string;
        activeHoursStart?: string;
        activeHoursEnd?: string;
    };
}

export interface Template {
    id: string;
    name: string;
    content: string;
    variables: string[];
    category: string;
    createdAt: string;
}

export interface Contact {
    id: string;
    name: string;
    phone: string;
    email?: string;
    tags: string[];
    hasWhatsApp: boolean;
    createdAt: string;
}

export interface CampaignStats {
    totalContacts: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
}

// Serviços de Campanhas
export const campaignsService = {
    async list(): Promise<Campaign[]> {
        const response = await api.get<any>('/campaigns?limit=50');
        return response.data?.data || response.data;
    },

    async listPaginated(page = 1, limit = 10): Promise<{ data: Campaign[]; meta: any }> {
        const response = await api.get<any>('/campaigns', { params: { page, limit } });
        if (Array.isArray(response.data)) {
            return { data: response.data, meta: { total: response.data.length, page: 1, limit: response.data.length, last_page: 1 } };
        }
        return response.data;
    },

    async get(id: string): Promise<Campaign> {
        const response = await api.get<Campaign>(`/campaigns/${id}`);
        return response.data;
    },

    async create(data: CreateCampaignDto): Promise<Campaign> {
        const response = await api.post<Campaign>('/campaigns', data);
        return response.data;
    },

    async generateVariations(id: string): Promise<{ variations: string[] }> {
        const response = await api.post<{ variations: string[] }>(`/campaigns/${id}/generate-variations`);
        return response.data;
    },

    async start(id: string): Promise<Campaign> {
        const response = await api.post<Campaign>(`/campaigns/${id}/start`);
        return response.data;
    },

    async pause(id: string): Promise<Campaign> {
        const response = await api.post<Campaign>(`/campaigns/${id}/pause`);
        return response.data;
    },

    async resume(id: string): Promise<Campaign> {
        const response = await api.post<Campaign>(`/campaigns/${id}/resume`);
        return response.data;
    },

    async cancel(id: string): Promise<Campaign> {
        const response = await api.post<Campaign>(`/campaigns/${id}/cancel`);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/campaigns/${id}`);
    },

    async duplicate(id: string): Promise<Campaign> {
        const response = await api.post<Campaign>(`/campaigns/${id}/duplicate`);
        return response.data;
    },

    async getStats(id: string): Promise<CampaignStats> {
        const response = await api.get<CampaignStats>(`/campaigns/${id}/stats`);
        return response.data;
    },

    // Templates
    async listTemplates(): Promise<Template[]> {
        const response = await api.get<Template[]>('/campaigns/templates');
        return response.data;
    },

    async createTemplate(data: Omit<Template, 'id' | 'createdAt'>): Promise<Template> {
        const response = await api.post<Template>('/campaigns/templates', data);
        return response.data;
    },

    async update(id: string, data: Partial<CreateCampaignDto>): Promise<Campaign> {
        const response = await api.patch<Campaign>(`/campaigns/${id}`, data);
        return response.data;
    },

    // Contacts
    async listContacts(): Promise<Contact[]> {
        const response = await api.get<any>('/campaigns/contacts?limit=100'); // Limite maior para contatos
        return response.data?.data || response.data;
    },

    async getContacts(campaignId: string, params?: { page?: number; limit?: number; status?: string }): Promise<{ data: any[]; meta: any }> {
        const response = await api.get<any>(`/campaigns/${campaignId}/contacts`, { params });
        return response.data;
    },

    async createContact(data: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact> {
        const response = await api.post<Contact>('/campaigns/contacts', data);
        return response.data;
    },

    async importContacts(file: File): Promise<{ imported: number; failed: number }> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<{ imported: number; failed: number }>('/campaigns/contacts/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};
