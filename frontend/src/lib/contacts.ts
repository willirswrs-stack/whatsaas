import api from './api';

// ============ TYPES ============

export interface Tag {
    id: string;
    name: string;
    color: string;
    description?: string;
    contactCount: number;
    createdAt: string;
}

export interface CustomField {
    id: string;
    name: string;
    key: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'select';
    options?: string[];
    required: boolean;
    order: number;
}

export interface Contact {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    category?: string;
    customFields: Record<string, any>;
    isValid: boolean;
    onWhatsapp?: boolean;
    optedOut: boolean;
    lastInteraction?: string;
    tags: Tag[];
    createdAt: string;
    updatedAt: string;
}

export interface ContactsResponse {
    data: Contact[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ContactStats {
    total: number;
    valid: number;
    invalid: number;
    optedOut: number;
    onWhatsapp: number;
    tagCount: number;
    topTags: Tag[];
}

export interface CreateContactDto {
    phone: string;
    name?: string;
    email?: string;
    category?: string;
    customFields?: Record<string, any>;
    tagIds?: string[];
}

export interface UpdateContactDto extends Partial<CreateContactDto> {
    isValid?: boolean;
    optedOut?: boolean;
}

export interface ContactQueryParams {
    search?: string;
    tagIds?: string[];
    category?: string;
    isValid?: boolean;
    optedOut?: boolean;
    page?: number;
    limit?: number;
}

// ============ CONTACTS API ============

export const contactsApi = {
    // Contacts
    async getContacts(params?: ContactQueryParams): Promise<ContactsResponse> {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append('search', params.search);
        if (params?.tagIds?.length) queryParams.append('tagIds', params.tagIds.join(','));
        if (params?.category) queryParams.append('category', params.category);
        if (params?.isValid !== undefined) queryParams.append('isValid', String(params.isValid));
        if (params?.optedOut !== undefined) queryParams.append('optedOut', String(params.optedOut));
        if (params?.page) queryParams.append('page', String(params.page));
        if (params?.limit) queryParams.append('limit', String(params.limit));

        const response = await api.get(`/contacts?${queryParams.toString()}`);
        return response.data;
    },

    async getContact(id: string): Promise<Contact> {
        const response = await api.get(`/contacts/${id}`);
        return response.data;
    },

    async createContact(data: CreateContactDto): Promise<Contact> {
        const response = await api.post('/contacts', data);
        return response.data;
    },

    async updateContact(id: string, data: UpdateContactDto): Promise<Contact> {
        const response = await api.put(`/contacts/${id}`, data);
        return response.data;
    },

    async deleteContact(id: string): Promise<void> {
        await api.delete(`/contacts/${id}`);
    },

    async bulkDeleteContacts(ids: string[]): Promise<void> {
        await api.post('/contacts/bulk/delete', { ids });
    },

    async importContacts(contacts: CreateContactDto[]): Promise<{ imported: number; skipped: number; errors: string[] }> {
        const response = await api.post('/contacts/import', { contacts });
        return response.data;
    },

    async importContactsFile(file: File): Promise<{ imported: number; skipped: number; errors: string[] }> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/contacts/import/file', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    async importFromWhatsApp(instanceId: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
        const response = await api.post('/contacts/import/whatsapp', { instanceId });
        return response.data;
    },

    async exportContacts(tagIds?: string[]): Promise<Contact[]> {
        const params = tagIds ? `?tagIds=${tagIds.join(',')}` : '';
        const response = await api.get(`/contacts/export${params}`);
        return response.data;
    },

    async getStats(): Promise<ContactStats> {
        const response = await api.get('/contacts/stats');
        return response.data;
    },

    // Bulk Tag Operations
    async bulkAddTags(contactIds: string[], tagIds: string[]): Promise<void> {
        await api.post('/contacts/bulk/add-tags', { contactIds, tagIds });
    },

    async bulkRemoveTags(contactIds: string[], tagIds: string[]): Promise<void> {
        await api.post('/contacts/bulk/remove-tags', { contactIds, tagIds });
    },

    // Tags
    async getTags(): Promise<Tag[]> {
        const response = await api.get('/contacts/tags/list');
        return response.data;
    },

    async getTag(id: string): Promise<Tag> {
        const response = await api.get(`/contacts/tags/${id}`);
        return response.data;
    },

    async createTag(data: { name: string; color?: string; description?: string }): Promise<Tag> {
        const response = await api.post('/contacts/tags', data);
        return response.data;
    },

    async updateTag(id: string, data: { name?: string; color?: string; description?: string }): Promise<Tag> {
        const response = await api.put(`/contacts/tags/${id}`, data);
        return response.data;
    },

    async deleteTag(id: string): Promise<void> {
        await api.delete(`/contacts/tags/${id}`);
    },

    // Custom Fields
    async getCustomFields(): Promise<CustomField[]> {
        const response = await api.get('/contacts/fields/list');
        return response.data;
    },

    async createCustomField(data: { name: string; key: string; type?: string; options?: string[]; required?: boolean }): Promise<CustomField> {
        const response = await api.post('/contacts/fields', data);
        return response.data;
    },

    async updateCustomField(id: string, data: Partial<CustomField>): Promise<CustomField> {
        const response = await api.put(`/contacts/fields/${id}`, data);
        return response.data;
    },

    async deleteCustomField(id: string): Promise<void> {
        await api.delete(`/contacts/fields/${id}`);
    },
};

export default contactsApi;

