import api from './api';

export interface InboxConversation {
    remoteJid: string;
    remotePhone: string;
    remoteName?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    instanceId?: string;
    instanceName?: string;
}

export interface InboxMessage {
    id: string;
    remoteJid: string;
    remotePhone: string;
    remoteName?: string;
    direction: 'inbound' | 'outbound';
    type: string;
    content: string;
    mediaUrl?: string;
    status: string;
    wamid: string;
    instanceId?: string;
    instanceName?: string;
    isRead: boolean;
    createdAt: string;
    contactId?: string;
    campaignId?: string;
}

export const inboxService = {
    async getConversations(params?: {
        instanceId?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ data: InboxConversation[]; total: number }> {
        const response = await api.get('/inbox', { params });
        return response.data;
    },

    async getMessages(
        jid: string,
        params?: { page?: number; limit?: number; instanceId?: string }
    ): Promise<{ data: InboxMessage[]; meta: any }> {
        const encodedJid = encodeURIComponent(jid);
        const response = await api.get(`/inbox/${encodedJid}/messages`, { params });
        return response.data;
    },

    async sendReply(
        jid: string,
        content: string,
        instanceId?: string
    ): Promise<InboxMessage> {
        const encodedJid = encodeURIComponent(jid);
        const response = await api.post(`/inbox/${encodedJid}/send`, { content, instanceId });
        return response.data.message;
    },

    async markAsRead(jid: string): Promise<void> {
        const encodedJid = encodeURIComponent(jid);
        await api.patch(`/inbox/${encodedJid}/read`);
    },

    async getUnreadCount(): Promise<number> {
        const response = await api.get('/inbox/unread-count');
        return response.data.count;
    }
};
