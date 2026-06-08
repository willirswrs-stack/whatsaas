import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

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

@Injectable()
export class MetaGraphApiService {
    private readonly logger = new Logger(MetaGraphApiService.name);
    private readonly apiVersion = 'v18.0';
    private readonly baseUrl = 'https://graph.facebook.com';

    constructor(private readonly configService: ConfigService) { }

    private createClient(accessToken: string): AxiosInstance {
        return axios.create({
            baseURL: `${this.baseUrl}/${this.apiVersion}`,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
        });
    }

    /**
     * Get WABA info
     */
    async getWabaInfo(wabaId: string, accessToken: string): Promise<any> {
        if (accessToken?.startsWith('mock') || wabaId?.startsWith('mock')) {
            return {
                id: wabaId,
                name: 'Mock WABA Account',
                currency: 'BRL',
                timezone_id: '1'
            };
        }
        try {
            const client = this.createClient(accessToken);
            const response = await client.get(`/${wabaId}`);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'getWabaInfo');
        }
    }

    /**
     * Get phone number info including quality rating
     */
    async getPhoneNumberInfo(phoneNumberId: string, accessToken: string): Promise<any> {
        if (accessToken?.startsWith('mock') || phoneNumberId?.startsWith('mock')) {
            return {
                display_phone_number: '+55 11 99999-9999',
                verified_name: 'Mock Account',
                quality_rating: 'GREEN',
                platform_type: 'CLOUD_API',
                throughput: '10'
            };
        }
        try {
            const client = this.createClient(accessToken);
            const response = await client.get(`/${phoneNumberId}`, {
                params: {
                    fields: 'display_phone_number,verified_name,quality_rating,platform_type,throughput',
                },
            });
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'getPhoneNumberInfo');
        }
    }

    /**
     * Get business profile
     */
    async getBusinessProfile(phoneNumberId: string, accessToken: string): Promise<BusinessProfile> {
        if (accessToken?.startsWith('mock') || phoneNumberId?.startsWith('mock')) {
            return {
                about: 'Conta Mock para testes locais.',
                address: 'Av. Paulista, 1000 - São Paulo, SP',
                description: 'WhatSaas Mock Profile',
                email: 'mock@company.com',
                profile_picture_url: '',
                websites: ['https://whatsaas.com'],
                vertical: 'OTHER'
            };
        }
        try {
            const client = this.createClient(accessToken);
            const response = await client.get(`/${phoneNumberId}/whatsapp_business_profile`, {
                params: {
                    fields: 'about,address,description,email,profile_picture_url,websites,vertical',
                },
            });
            return response.data.data?.[0] || {};
        } catch (error) {
            this.handleApiError(error, 'getBusinessProfile');
        }
    }

    /**
     * Update business profile
     */
    async updateBusinessProfile(
        phoneNumberId: string,
        accessToken: string,
        profile: Partial<BusinessProfile>,
    ): Promise<boolean> {
        try {
            const client = this.createClient(accessToken);
            const response = await client.post(`/${phoneNumberId}/whatsapp_business_profile`, {
                messaging_product: 'whatsapp',
                ...profile,
            });
            return response.data.success === true;
        } catch (error) {
            this.handleApiError(error, 'updateBusinessProfile');
        }
    }

    /**
     * List all message templates
     */
    async listTemplates(wabaId: string, accessToken: string): Promise<MetaTemplate[]> {
        if (accessToken?.startsWith('mock') || wabaId?.startsWith('mock')) {
            return [
                {
                    id: 'mock-template-1',
                    name: 'boas_vindas',
                    category: 'MARKETING',
                    language: 'pt_BR',
                    status: 'APPROVED',
                    components: [
                        { type: 'HEADER', format: 'TEXT', text: 'Olá {{1}}!' },
                        { type: 'BODY', text: 'Seja bem-vindo à nossa plataforma. Seu código é {{1}}.' }
                    ]
                },
                {
                    id: 'mock-template-2',
                    name: 'lembrete_fatura',
                    category: 'UTILITY',
                    language: 'pt_BR',
                    status: 'APPROVED',
                    components: [
                        { type: 'BODY', text: 'Sua fatura vence amanhã. Valor: R$ {{1}}.' }
                    ]
                },
                {
                    id: 'mock-template-3',
                    name: 'codigo_seguranca',
                    category: 'AUTHENTICATION',
                    language: 'pt_BR',
                    status: 'APPROVED',
                    components: [
                        { type: 'BODY', text: 'Seu código de acesso é {{1}}.' }
                    ]
                }
            ];
        }
        try {
            const client = this.createClient(accessToken);
            const templates: MetaTemplate[] = [];
            let nextUrl = `/${wabaId}/message_templates?fields=id,name,category,language,status,components,quality_score,rejected_reason&limit=100`;

            while (nextUrl) {
                const response = await client.get(nextUrl);
                templates.push(...response.data.data);

                // Handle pagination
                nextUrl = response.data.paging?.next ?
                    response.data.paging.next.replace(`${this.baseUrl}/${this.apiVersion}`, '') :
                    null;
            }

            return templates;
        } catch (error) {
            this.handleApiError(error, 'listTemplates');
        }
    }

    /**
     * Get single template by name
     */
    async getTemplate(wabaId: string, accessToken: string, templateName: string): Promise<MetaTemplate | null> {
        try {
            const client = this.createClient(accessToken);
            const response = await client.get(`/${wabaId}/message_templates`, {
                params: {
                    name: templateName,
                    fields: 'id,name,category,language,status,components,quality_score,rejected_reason',
                },
            });
            return response.data.data?.[0] || null;
        } catch (error) {
            this.handleApiError(error, 'getTemplate');
        }
    }

    /**
     * Create a new message template
     */
    async createTemplate(
        wabaId: string,
        accessToken: string,
        template: {
            name: string;
            category: string;
            language: string;
            components: any[];
        },
    ): Promise<{ id: string; status: string }> {
        try {
            const client = this.createClient(accessToken);
            const response = await client.post(`/${wabaId}/message_templates`, template);
            return {
                id: response.data.id,
                status: response.data.status || 'PENDING',
            };
        } catch (error) {
            this.handleApiError(error, 'createTemplate');
        }
    }

    /**
     * Delete a message template
     */
    async deleteTemplate(wabaId: string, accessToken: string, templateName: string): Promise<boolean> {
        try {
            const client = this.createClient(accessToken);
            const response = await client.delete(`/${wabaId}/message_templates`, {
                params: { name: templateName },
            });
            return response.data.success === true;
        } catch (error) {
            this.handleApiError(error, 'deleteTemplate');
        }
    }

    async uploadMedia(
        phoneNumberId: string,
        accessToken: string,
        mediaUrl: string,
        mediaType: 'image' | 'video' | 'document',
    ): Promise<string> {
        try {
            const client = this.createClient(accessToken);
            
            let buffer: Buffer;
            let filename = `media.${mediaType}`;
            let mimeType = 'application/octet-stream';
            
            if (mediaType === 'image') mimeType = 'image/jpeg';
            else if (mediaType === 'video') mimeType = 'video/mp4';
            else if (mediaType === 'document') mimeType = 'application/pdf';

            // First, get the media from URL
            if (mediaUrl.startsWith('http://localhost') || mediaUrl.startsWith('http://host.docker.internal')) {
                // Read local file directly bypassing external network stack
                const fs = require('fs');
                const path = require('path');
                const parsedUrl = new URL(mediaUrl);
                const localFileName = path.basename(parsedUrl.pathname);
                const localPath = path.join(process.cwd(), 'uploads', localFileName);
                if (!fs.existsSync(localPath)) {
                   throw new Error(`Arquivo local não encontrado: ${localPath}`);
                }
                buffer = fs.readFileSync(localPath);
                filename = localFileName;
                if (filename.endsWith('.png')) mimeType = 'image/png';
            } else {
                const mediaResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
                buffer = Buffer.from(mediaResponse.data);
            }

            const FormData = require('form-data');
            const form = new FormData();
            form.append('messaging_product', 'whatsapp');
            form.append('type', mediaType === 'document' ? 'document' : (mediaType === 'video' ? 'video' : 'image'));
            form.append('file', buffer, {
                filename: filename,
                contentType: mimeType,
            });

            const response = await client.post(`/${phoneNumberId}/media`, form, {
                headers: { ...form.getHeaders() },
            });

            return response.data.id;
        } catch (error) {
            this.handleApiError(error, 'uploadMedia');
        }
    }

    /**
     * Send a message (text, template, media, etc.)
     */
    async sendMessage(
        phoneNumberId: string,
        accessToken: string,
        recipientPhone: string,
        type: 'text' | 'template' | 'image' | 'video' | 'document' | 'audio' | 'sticker' | 'location' | 'contacts' | 'interactive',
        content: any,
        context?: { message_id: string }
    ): Promise<{ messages: [{ id: string }] }> {
        try {
            const client = this.createClient(accessToken);

            const payload: any = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipientPhone,
                type: type,
            };

            // Add content based on type
            payload[type] = content;

            // Reply to message context
            if (context) {
                payload.context = context;
            }

            const response = await client.post(`/${phoneNumberId}/messages`, payload);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'sendMessage');
        }
    }

    /**
     * Handle API errors consistently
     */
    private handleApiError(error: any, operation: string): never {
        const errorMessage = error.response?.data?.error?.message || error.message;
        const errorCode = error.response?.data?.error?.code;

        this.logger.error(`Meta API Error [${operation}]: ${errorMessage} (Code: ${errorCode})`);

        if (error.response?.status === 401) {
            throw new HttpException('Invalid or expired access token', HttpStatus.UNAUTHORIZED);
        }

        if (error.response?.status === 403) {
            throw new HttpException('Insufficient permissions for this operation', HttpStatus.FORBIDDEN);
        }

        if (error.response?.status === 429) {
            throw new HttpException('Rate limit exceeded. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
        }

        throw new HttpException(
            `Meta API Error: ${errorMessage}`,
            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}
