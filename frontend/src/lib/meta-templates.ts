import api from './api';
export { getErrorMessage } from './api';

// Alias para compatibilidade
const apiClient = api;

// Types
export interface WabaAccount {
    id: string;
    name: string;
    wabaId: string;
    phoneNumberId: string;
    phoneNumber: string;
    accessTokenMasked: string;
    appId?: string;
    displayName?: string;
    about?: string;
    description?: string;
    category: string;
    email?: string;
    profilePhoto?: string;
    status: 'active' | 'pending' | 'disconnected';
    qualityRating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    createdAt: string;
    updatedAt: string;
}

export interface MetaTemplate {
    id: string;
    name: string;
    category: string;
    language: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED';
    components: any[];
    quality_score?: {
        score: string;
        date: string;
    };
    rejected_reason?: string;
}

export interface BusinessProfile {
    about: string;
    address: string;
    description: string;
    email: string;
    profile_picture_url: string;
    websites: string[];
    vertical: string;
}

export interface CreateWabaAccountDto {
    name: string;
    wabaId: string;
    phoneNumberId: string;
    phoneNumber: string;
    accessToken: string;
    appId?: string;
}

export interface UpdateProfileDto {
    about?: string;
    description?: string;
    category?: string;
    email?: string;
    appId?: string;
    websites?: string[];
    address?: string;
}

export interface CreateTemplateDto {
    name: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    header?: {
        type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
        text?: string;
        example?: string;
    };
    body: string;
    footer?: string;
    buttons?: Array<{
        type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
        text: string;
        url?: string;
        phone_number?: string;
    }>;
}

export const BUSINESS_CATEGORIES = [
    { value: 'AUTOMOTIVE', label: 'Automotivo' },
    { value: 'BEAUTY_SPA_SALON', label: 'Beleza, Spa e Salão' },
    { value: 'CLOTHING_APPAREL', label: 'Roupas e Acessórios' },
    { value: 'EDUCATION', label: 'Educação' },
    { value: 'ENTERTAINMENT', label: 'Entretenimento' },
    { value: 'EVENT_PLANNING', label: 'Planejamento de Eventos' },
    { value: 'FINANCE', label: 'Finanças' },
    { value: 'GROCERY', label: 'Supermercado' },
    { value: 'GOVERNMENT', label: 'Governo' },
    { value: 'HOTEL_LODGING', label: 'Hotel e Hospedagem' },
    { value: 'HEALTH', label: 'Saúde' },
    { value: 'NONPROFIT', label: 'Organização sem Fins Lucrativos' },
    { value: 'PROFESSIONAL_SERVICES', label: 'Serviços Profissionais' },
    { value: 'RETAIL', label: 'Varejo' },
    { value: 'TRAVEL_TRANSPORTATION', label: 'Viagens e Transporte' },
    { value: 'RESTAURANT', label: 'Restaurante' },
    { value: 'OTHER', label: 'Outro' },
];

export const TEMPLATE_LANGUAGES = [
    { value: 'pt_BR', label: 'Português (Brasil)' },
    { value: 'en_US', label: 'Inglês (EUA)' },
    { value: 'es', label: 'Espanhol' },
    { value: 'es_AR', label: 'Espanhol (Argentina)' },
    { value: 'es_MX', label: 'Espanhol (México)' },
];

// Service
export const metaTemplatesService = {
    // =====================================================
    // WABA ACCOUNTS
    // =====================================================

    async listAccounts(): Promise<WabaAccount[]> {
        const response = await apiClient.get('/meta-templates/accounts');
        return response.data;
    },

    async createAccount(dto: CreateWabaAccountDto): Promise<WabaAccount> {
        const response = await apiClient.post('/meta-templates/accounts', dto);
        return response.data;
    },

    async getAccount(id: string): Promise<WabaAccount> {
        const response = await apiClient.get(`/meta-templates/accounts/${id}`);
        return response.data;
    },

    async deleteAccount(id: string): Promise<void> {
        await apiClient.delete(`/meta-templates/accounts/${id}`);
    },

    async syncAccount(id: string): Promise<WabaAccount> {
        const response = await apiClient.post(`/meta-templates/accounts/${id}/sync`);
        return response.data;
    },

    // =====================================================
    // PROFILE
    // =====================================================

    async getProfile(accountId: string): Promise<BusinessProfile> {
        const response = await apiClient.get(`/meta-templates/accounts/${accountId}/profile`);
        return response.data;
    },

    async updateProfile(accountId: string, dto: UpdateProfileDto): Promise<WabaAccount> {
        const response = await apiClient.put(`/meta-templates/accounts/${accountId}/profile`, dto);
        return response.data;
    },

    // =====================================================
    // TEMPLATES
    // =====================================================

    async listTemplates(accountId: string): Promise<MetaTemplate[]> {
        const response = await apiClient.get(`/meta-templates/accounts/${accountId}/templates`);
        return response.data;
    },

    async createTemplate(accountId: string, dto: CreateTemplateDto): Promise<{ id: string; status: string }> {
        const response = await apiClient.post(`/meta-templates/accounts/${accountId}/templates`, dto);
        return response.data;
    },

    async deleteTemplate(accountId: string, templateName: string): Promise<void> {
        await apiClient.delete(`/meta-templates/accounts/${accountId}/templates/${templateName}`);
    },
};

// ============ HELPER FUNCTIONS ============

export const getTemplateStatusColor = (status: MetaTemplate['status']): string => {
    switch (status) {
        case 'APPROVED': return '#22c55e';
        case 'PENDING': return '#f59e0b';
        case 'REJECTED': return '#ef4444';
        case 'DISABLED': return '#6b7280';
        default: return '#6b7280';
    }
};

export const getTemplateStatusLabel = (status: MetaTemplate['status']): string => {
    switch (status) {
        case 'APPROVED': return 'Aprovado';
        case 'PENDING': return 'Pendente';
        case 'REJECTED': return 'Rejeitado';
        case 'DISABLED': return 'Desativado';
        default: return status;
    }
};

export const TEMPLATE_CATEGORIES = [
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'UTILITY', label: 'Utilidade' },
    { value: 'AUTHENTICATION', label: 'Autenticação' },
];
