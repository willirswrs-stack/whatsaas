"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MetaGraphApiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaGraphApiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let MetaGraphApiService = MetaGraphApiService_1 = class MetaGraphApiService {
    configService;
    logger = new common_1.Logger(MetaGraphApiService_1.name);
    apiVersion = 'v18.0';
    baseUrl = 'https://graph.facebook.com';
    constructor(configService) {
        this.configService = configService;
    }
    createClient(accessToken) {
        return axios_1.default.create({
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
    async getWabaInfo(wabaId, accessToken) {
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
        }
        catch (error) {
            this.handleApiError(error, 'getWabaInfo');
        }
    }
    /**
     * Get phone number info including quality rating
     */
    async getPhoneNumberInfo(phoneNumberId, accessToken) {
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
        }
        catch (error) {
            this.handleApiError(error, 'getPhoneNumberInfo');
        }
    }
    /**
     * Get business profile
     */
    async getBusinessProfile(phoneNumberId, accessToken) {
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
        }
        catch (error) {
            this.handleApiError(error, 'getBusinessProfile');
        }
    }
    /**
     * Update business profile
     */
    async updateBusinessProfile(phoneNumberId, accessToken, profile) {
        try {
            const client = this.createClient(accessToken);
            const response = await client.post(`/${phoneNumberId}/whatsapp_business_profile`, {
                messaging_product: 'whatsapp',
                ...profile,
            });
            return response.data.success === true;
        }
        catch (error) {
            this.handleApiError(error, 'updateBusinessProfile');
        }
    }
    /**
     * List all message templates
     */
    async listTemplates(wabaId, accessToken) {
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
            const templates = [];
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
        }
        catch (error) {
            this.handleApiError(error, 'listTemplates');
        }
    }
    /**
     * Get single template by name
     */
    async getTemplate(wabaId, accessToken, templateName) {
        try {
            const client = this.createClient(accessToken);
            const response = await client.get(`/${wabaId}/message_templates`, {
                params: {
                    name: templateName,
                    fields: 'id,name,category,language,status,components,quality_score,rejected_reason',
                },
            });
            return response.data.data?.[0] || null;
        }
        catch (error) {
            this.handleApiError(error, 'getTemplate');
        }
    }
    /**
     * Create a new message template
     */
    async createTemplate(wabaId, accessToken, template) {
        try {
            const client = this.createClient(accessToken);
            const response = await client.post(`/${wabaId}/message_templates`, template);
            return {
                id: response.data.id,
                status: response.data.status || 'PENDING',
            };
        }
        catch (error) {
            this.handleApiError(error, 'createTemplate');
        }
    }
    /**
     * Delete a message template
     */
    async deleteTemplate(wabaId, accessToken, templateName) {
        try {
            const client = this.createClient(accessToken);
            const response = await client.delete(`/${wabaId}/message_templates`, {
                params: { name: templateName },
            });
            return response.data.success === true;
        }
        catch (error) {
            this.handleApiError(error, 'deleteTemplate');
        }
    }
    async uploadMedia(phoneNumberId, accessToken, mediaUrl, mediaType) {
        try {
            const client = this.createClient(accessToken);
            let buffer;
            let filename = `media.${mediaType}`;
            let mimeType = 'application/octet-stream';
            if (mediaType === 'image')
                mimeType = 'image/jpeg';
            else if (mediaType === 'video')
                mimeType = 'video/mp4';
            else if (mediaType === 'document')
                mimeType = 'application/pdf';
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
                if (filename.endsWith('.png'))
                    mimeType = 'image/png';
            }
            else {
                const mediaResponse = await axios_1.default.get(mediaUrl, { responseType: 'arraybuffer' });
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
        }
        catch (error) {
            this.handleApiError(error, 'uploadMedia');
        }
    }
    /**
     * Send a message (text, template, media, etc.)
     */
    async sendMessage(phoneNumberId, accessToken, recipientPhone, type, content, context) {
        try {
            const client = this.createClient(accessToken);
            const payload = {
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
        }
        catch (error) {
            this.handleApiError(error, 'sendMessage');
        }
    }
    /**
     * Handle API errors consistently
     */
    handleApiError(error, operation) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        const errorCode = error.response?.data?.error?.code;
        this.logger.error(`Meta API Error [${operation}]: ${errorMessage} (Code: ${errorCode})`);
        if (error.response?.status === 401) {
            throw new common_1.HttpException('Invalid or expired access token', common_1.HttpStatus.UNAUTHORIZED);
        }
        if (error.response?.status === 403) {
            throw new common_1.HttpException('Insufficient permissions for this operation', common_1.HttpStatus.FORBIDDEN);
        }
        if (error.response?.status === 429) {
            throw new common_1.HttpException('Rate limit exceeded. Please try again later.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        throw new common_1.HttpException(`Meta API Error: ${errorMessage}`, error.response?.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
    }
};
exports.MetaGraphApiService = MetaGraphApiService;
exports.MetaGraphApiService = MetaGraphApiService = MetaGraphApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MetaGraphApiService);
