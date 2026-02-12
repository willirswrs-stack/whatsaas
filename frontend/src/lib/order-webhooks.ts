import api from './api';

// ==================== Types ====================

export interface WebhookIntegration {
    id: string;
    tenantId: string;
    name: string;
    provider: WebhookProvider;
    isEnabled: boolean;
    inboundSecret: string;
    signatureHeader?: string;
    signatureType: SignatureType;
    endpointSlug: string;
    rateLimitPerMinute: number;
    createdAt: string;
    updatedAt: string;
}

export type WebhookProvider =
    | 'generic'
    | 'shopify'
    | 'woocommerce'
    | 'yampi'
    | 'cartpanda'
    | 'nuvemshop'
    | 'tray'
    | 'other';

export type SignatureType = 'none' | 'hmac_sha256' | 'token_header';

export interface CreateWebhookIntegrationDto {
    name: string;
    provider?: WebhookProvider;
    isEnabled?: boolean;
    signatureHeader?: string;
    signatureType?: SignatureType;
    endpointSlug?: string;
    rateLimitPerMinute?: number;
}

export interface UpdateWebhookIntegrationDto extends Partial<CreateWebhookIntegrationDto> { }

export interface WebhookEventType {
    id: string;
    code: string;
    label: string;
    description?: string;
    isActive: boolean;
}

export interface WebhookEventMapping {
    id: string;
    tenantId: string;
    integrationId: string;
    eventTypeCode: string;
    isEnabled: boolean;
    matchRules: Record<string, any>;
    messageChannel: 'whatsapp';
    whatsappInstanceId?: string;
    sendMode: 'template_only' | 'template_preferred' | 'free_text_if_24h';
    templateName?: string;
    templateLanguage: string;
    templateVariablesMap: Record<string, string>;
    fallbackText?: string;
    rateLimitPerMinute: number;
    forwardToN8n: boolean;
    n8nWebhookUrl?: string;
    createdAt: string;
    updatedAt: string;
    integration?: WebhookIntegration;
}

export interface CreateEventMappingDto {
    integrationId: string;
    eventTypeCode: string;
    isEnabled?: boolean;
    matchRules?: Record<string, any>;
    whatsappInstanceId?: string;
    sendMode?: 'template_only' | 'template_preferred' | 'free_text_if_24h';
    templateName?: string;
    templateLanguage?: string;
    templateVariablesMap?: Record<string, string>;
    fallbackText?: string;
    rateLimitPerMinute?: number;
    forwardToN8n?: boolean;
    n8nWebhookUrl?: string;
}

export interface UpdateEventMappingDto extends Partial<CreateEventMappingDto> { }

export interface WebhookEventInbox {
    id: string;
    tenantId: string;
    integrationId: string;
    providerEventId?: string;
    eventTypeCode: string;
    eventHash: string;
    occurredAt: string;
    payloadRaw: Record<string, any>;
    normalizedData?: Record<string, any>;
    receivedAt: string;
    processedStatus: 'pending' | 'processed' | 'ignored' | 'failed';
    processedAt?: string;
    errorMessage?: string;
    processingLog: Array<{ timestamp: string; action: string; details?: any }>;
}

export interface MessageOutbox {
    id: string;
    tenantId: string;
    sourceEventId: string;
    channel: 'whatsapp';
    toPhoneE164: string;
    customerName?: string;
    orderId?: string;
    templateName?: string;
    templateLanguage?: string;
    templateParams?: Record<string, any>;
    messageText?: string;
    provider: 'evolution_cloud';
    providerInstanceId: string;
    providerMessageId?: string;
    status: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'retrying';
    tries: number;
    lastError?: string;
    createdAt: string;
    updatedAt: string;
    sentAt?: string;
}

export interface WebhookStatistics {
    totalIntegrations: number;
    activeIntegrations: number;
    eventsToday: number;
    messagesQueued: number;
    messagesSent: number;
    messagesFailed: number;
}

export interface NormalizedPayload {
    orderId: string;
    orderNumber?: string;
    orderStatus?: string;
    customerName: string;
    customerEmail?: string;
    phoneE164: string;
    trackingCode?: string;
    trackingUrl?: string;
    shippingDate?: string;
    estimatedDeliveryDate?: string;
    cancelReason?: string;
    itemsCount?: number;
    totalAmount?: number;
    currency?: string;
    storeName?: string;
    shippingMethod?: string;
    eventType: string;
    occurredAt: string;
}

// ==================== API Service ====================

const BASE_URL = '/order-webhooks';

export const orderWebhooksApi = {
    // ==================== Integrations ====================

    async listIntegrations(): Promise<WebhookIntegration[]> {
        const response = await api.get(`${BASE_URL}/integrations`);
        return response.data;
    },

    async createIntegration(data: CreateWebhookIntegrationDto): Promise<WebhookIntegration> {
        const response = await api.post(`${BASE_URL}/integrations`, data);
        return response.data;
    },

    async getIntegration(id: string): Promise<WebhookIntegration> {
        const response = await api.get(`${BASE_URL}/integrations/${id}`);
        return response.data;
    },

    async updateIntegration(id: string, data: UpdateWebhookIntegrationDto): Promise<WebhookIntegration> {
        const response = await api.patch(`${BASE_URL}/integrations/${id}`, data);
        return response.data;
    },

    async deleteIntegration(id: string): Promise<void> {
        await api.delete(`${BASE_URL}/integrations/${id}`);
    },

    async regenerateSecret(id: string): Promise<{ secret: string }> {
        const response = await api.post(`${BASE_URL}/integrations/${id}/regenerate-secret`);
        return response.data;
    },

    async testWebhook(id: string, payload: Record<string, any>): Promise<{
        success: boolean;
        normalized: NormalizedPayload;
        detectedEventType: string;
    }> {
        const response = await api.post(`${BASE_URL}/integrations/${id}/test`, payload);
        return response.data;
    },

    // ==================== Event Types ====================

    async listEventTypes(): Promise<WebhookEventType[]> {
        const response = await api.get(`${BASE_URL}/event-types`);
        return response.data;
    },

    // ==================== Event Mappings ====================

    async listMappings(integrationId?: string): Promise<WebhookEventMapping[]> {
        const params = integrationId ? { integrationId } : {};
        const response = await api.get(`${BASE_URL}/mappings`, { params });
        return response.data;
    },

    async createMapping(data: CreateEventMappingDto): Promise<WebhookEventMapping> {
        const response = await api.post(`${BASE_URL}/mappings`, data);
        return response.data;
    },

    async getMapping(id: string): Promise<WebhookEventMapping> {
        const response = await api.get(`${BASE_URL}/mappings/${id}`);
        return response.data;
    },

    async updateMapping(id: string, data: UpdateEventMappingDto): Promise<WebhookEventMapping> {
        const response = await api.patch(`${BASE_URL}/mappings/${id}`, data);
        return response.data;
    },

    async deleteMapping(id: string): Promise<void> {
        await api.delete(`${BASE_URL}/mappings/${id}`);
    },

    // ==================== Inbox (Events Monitoring) ====================

    async listInboxEvents(filters?: {
        integrationId?: string;
        eventTypeCode?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<{ data: WebhookEventInbox[]; total: number }> {
        const response = await api.get(`${BASE_URL}/inbox`, { params: filters });
        return response.data;
    },

    async getInboxEvent(id: string): Promise<WebhookEventInbox> {
        const response = await api.get(`${BASE_URL}/inbox/${id}`);
        return response.data;
    },

    // ==================== Outbox (Messages Monitoring) ====================

    async listOutboxMessages(filters?: {
        status?: string;
        phone?: string;
        orderId?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<{ data: MessageOutbox[]; total: number }> {
        const response = await api.get(`${BASE_URL}/outbox`, { params: filters });
        return response.data;
    },

    async retryMessage(id: string): Promise<MessageOutbox> {
        const response = await api.post(`${BASE_URL}/outbox/${id}/retry`);
        return response.data;
    },

    // ==================== Statistics ====================

    async getStatistics(): Promise<WebhookStatistics> {
        const response = await api.get(`${BASE_URL}/statistics`);
        return response.data;
    },

    // ==================== Helpers ====================

    /**
     * Generate webhook URL for a given tenant slug and integration
     */
    getWebhookUrl(tenantSlug: string, endpointSlug: string): string {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';
        return `${baseUrl.replace('/api/v1', '')}/api/v1/webhooks/${tenantSlug}/${endpointSlug}`;
    },

    /**
     * Get provider display name
     */
    getProviderLabel(provider: WebhookProvider): string {
        const labels: Record<WebhookProvider, string> = {
            generic: 'Genérico',
            shopify: 'Shopify',
            woocommerce: 'WooCommerce',
            yampi: 'Yampi',
            cartpanda: 'CartPanda',
            nuvemshop: 'Nuvemshop',
            tray: 'Tray',
            other: 'Outro',
        };
        return labels[provider] || provider;
    },

    /**
     * Get status display config
     */
    getStatusConfig(status: string): { label: string; color: string; bg: string } {
        const configs: Record<string, { label: string; color: string; bg: string }> = {
            pending: { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
            processed: { label: 'Processado', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
            ignored: { label: 'Ignorado', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' },
            failed: { label: 'Falhou', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
            queued: { label: 'Na fila', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
            sending: { label: 'Enviando', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
            sent: { label: 'Enviado', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
            delivered: { label: 'Entregue', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
            read: { label: 'Lido', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
            retrying: { label: 'Reenviando', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
        };
        return configs[status] || { label: status, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' };
    },
};

export default orderWebhooksApi;
