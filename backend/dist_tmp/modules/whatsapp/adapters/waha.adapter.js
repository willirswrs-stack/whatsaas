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
var WahaAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WahaAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const instance_status_enum_1 = require("../../../common/enums/instance-status.enum");
let WahaAdapter = WahaAdapter_1 = class WahaAdapter {
    configService;
    providerType = 'waha';
    logger = new common_1.Logger(WahaAdapter_1.name);
    baseUrl;
    apiKey;
    constructor(configService) {
        this.configService = configService;
        this.baseUrl = configService.get('WAHA_API_URL', 'http://localhost:8080');
        this.apiKey = configService.get('WAHA_API_KEY', '');
    }
    async createInstance(instanceName, config) {
        const sessionName = 'default';
        try {
            try {
                await this.request('POST', '/api/sessions', {
                    name: sessionName,
                    config: { proxy: null, webhooks: [] },
                });
                this.logger.log(`Created WAHA session: ${sessionName}`);
            }
            catch (error) {
                if (error.message?.includes('already exists')) {
                    this.logger.log(`Session '${sessionName}' already exists`);
                }
                else {
                    throw error;
                }
            }
            try {
                await this.request('POST', `/api/sessions/${sessionName}/start`);
                this.logger.log(`Started WAHA session: ${sessionName}`);
            }
            catch (e) { }
            return {
                instanceId: sessionName,
                displayName: instanceName,
                provider: 'waha',
            };
        }
        catch (error) {
            this.logger.error(`Failed to create WAHA instance: ${error.message}`);
            throw error;
        }
    }
    async getQrCode(instanceName) {
        const sessionName = 'default';
        try {
            await this.request('POST', `/api/sessions/${sessionName}/start`);
        }
        catch (e) { }
        const maxRetries = 5;
        const retryDelay = 1500;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const url = `${this.baseUrl}/api/${sessionName}/auth/qr`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'X-Api-Key': this.apiKey },
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    if (errorText.includes('STARTING') || errorText.includes('Try again')) {
                        await this.sleep(retryDelay);
                        continue;
                    }
                    throw new Error(`WAHA QR error: ${response.status} - ${errorText}`);
                }
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('image/')) {
                    const arrayBuffer = await response.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    return `data:${contentType};base64,${base64}`;
                }
                if (contentType.includes('application/json')) {
                    const data = await response.json();
                    if (data.value)
                        return `data:${data.mimetype || 'image/png'};base64,${data.value}`;
                    if (data.base64)
                        return data.base64;
                }
                return '';
            }
            catch (error) {
                if (error.message?.includes('STARTING') || error.message?.includes('Try again')) {
                    await this.sleep(retryDelay);
                    continue;
                }
                throw error;
            }
        }
        return '';
    }
    async getStatus(instanceName) {
        try {
            const response = await this.request('GET', `/api/sessions/default`);
            return {
                status: this.mapStatus(response.status),
                phoneNumber: response.me?.id,
                name: response.me?.pushname,
                exists: true,
            };
        }
        catch (error) {
            return { status: instance_status_enum_1.InstanceStatus.DISCONNECTED, exists: false };
        }
    }
    async deleteInstance(instanceName) {
        try {
            await this.request('POST', `/api/sessions/default/stop`);
        }
        catch (e) { }
    }
    async sendText(instanceName, to, text) {
        const response = await this.request('POST', `/api/default/sendText`, {
            chatId: this.formatJid(to),
            text,
        });
        return {
            messageId: response.id || response.key?.id || 'unknown',
            status: 'sent',
        };
    }
    async sendMedia(instanceName, to, media) {
        let fileUrl = media.url;
        // Detect if media.url is a raw base64 string (i.e. doesn't start with http or data:)
        if (media.type === 'audio' && !media.url.startsWith('http') && !media.url.startsWith('data:')) {
            fileUrl = `data:audio/mpeg;base64,${media.url}`;
        }
        // WAHA uses sendFile endpoint for media
        const response = await this.request('POST', `/api/default/sendFile`, {
            chatId: this.formatJid(to),
            file: {
                mimetype: media.type === 'video' ? 'video/mp4' : media.type === 'audio' ? 'audio/mpeg' : media.type === 'image' ? 'image/jpeg' : 'application/pdf',
                url: fileUrl,
                filename: media.filename || `file.${media.type === 'video' ? 'mp4' : media.type === 'audio' ? 'mp3' : media.type === 'image' ? 'jpg' : 'pdf'}`,
            },
            caption: media.caption || '',
        });
        this.logger.log(`Sent ${media.type} to ${to} via WAHA API`);
        return {
            messageId: response.id || response.key?.id || 'unknown',
            status: 'sent',
        };
    }
    async sendPresence(instanceName, to, presence, durationMs) {
        try {
            const endpoint = presence === 'paused' ? `/api/default/stopTyping` : `/api/default/startTyping`;
            await this.request('POST', endpoint, { chatId: this.formatJid(to) });
            if (presence !== 'paused') {
                await this.sleep(durationMs);
                await this.request('POST', `/api/default/stopTyping`, { chatId: this.formatJid(to) });
            }
        }
        catch (error) {
            this.logger.warn(`Failed to send presence: ${error.message}`);
        }
    }
    async isOnWhatsApp(instanceName, phone) {
        try {
            const response = await this.request('POST', `/api/default/contacts/check`, {
                phone: [this.formatPhone(phone)],
            });
            return response[0]?.isRegistered || false;
        }
        catch (error) {
            return false;
        }
    }
    async getMaturityMetrics(instanceName) {
        // Placeholder for WAHA implementation
        return { chatCount: 0, groupCount: 0 };
    }
    async joinGroup(instanceName, inviteUrl) {
        try {
            this.logger.log(`[WAHA] Joining group via invite: ${inviteUrl} for instance ${instanceName}`);
            const sessionName = 'default';
            return await this.request('POST', `/api/${sessionName}/groups/accept-invite`, {
                invite_url: inviteUrl,
            });
        }
        catch (error) {
            this.logger.error(`Failed to join group in WAHA: ${error.message}`);
            throw error;
        }
    }
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const options = {
            method,
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey },
        };
        if (body)
            options.body = JSON.stringify(body);
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WAHA API error: ${response.status} - ${errorText}`);
        }
        return response.json();
    }
    formatJid(phone) {
        return `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    }
    formatPhone(phone) {
        let clean = phone.replace(/\D/g, '');
        // Se não tem DDI (ex: 11999999999), assume Brasil (55)
        if (clean.length === 10 || clean.length === 11) {
            clean = '55' + clean;
        }
        // Se tem DDI do Brasil (55), vamos checar o nono dígito
        if (clean.startsWith('55')) {
            const ddd = parseInt(clean.substring(2, 4));
            // Brasil: Se tem 12 dígitos (55 + DDD + 8 dígitos), adicionar o 9
            if (clean.length === 12 && ddd >= 11 && ddd <= 99) {
                const prefix = clean.substring(0, 4); // 55 + DDD
                const suffix = clean.substring(4); // os 8 dígitos
                clean = prefix + '9' + suffix;
            }
        }
        return clean;
    }
    mapStatus(wahaStatus) {
        const map = {
            'WORKING': instance_status_enum_1.InstanceStatus.CONNECTED,
            'SCAN_QR_CODE': instance_status_enum_1.InstanceStatus.QR_PENDING,
            'STARTING': instance_status_enum_1.InstanceStatus.CONNECTING,
            'STOPPED': instance_status_enum_1.InstanceStatus.DISCONNECTED,
            'FAILED': instance_status_enum_1.InstanceStatus.ERROR,
        };
        return map[wahaStatus] || instance_status_enum_1.InstanceStatus.DISCONNECTED;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async getContacts(instanceName) {
        const sessionName = 'default';
        try {
            const response = await this.request('GET', `/api/${sessionName}/contacts`);
            if (Array.isArray(response))
                return response;
            if (response && Array.isArray(response.contacts))
                return response.contacts;
            if (response && Array.isArray(response.data))
                return response.data;
            return [];
        }
        catch (error) {
            this.logger.error(`Failed to get WAHA contacts: ${error.message}`);
            throw error;
        }
    }
};
exports.WahaAdapter = WahaAdapter;
exports.WahaAdapter = WahaAdapter = WahaAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WahaAdapter);
