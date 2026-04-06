
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IWhatsAppProvider,
    InstanceResult,
    InstanceStatus,
    SendMessageResult,
} from '../whatsapp-provider.interface';
import { InstanceStatus as EnumInstanceStatus } from '../../../common/enums/instance-status.enum';

interface WahaSessionResponse {
    name: string;
    status: string;
    me?: {
        id: string;
        pushname: string;
    };
}

interface WahaSendTextResponse {
    id: string;
    key?: { id: string };
}

interface WahaCheckNumberResponse {
    isRegistered: boolean;
}

@Injectable()
export class WahaAdapter implements IWhatsAppProvider {
    readonly providerType = 'waha' as const;
    private readonly logger = new Logger(WahaAdapter.name);
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor(private configService: ConfigService) {
        this.baseUrl = configService.get('WAHA_API_URL', 'http://localhost:8080');
        this.apiKey = configService.get('WAHA_API_KEY', '');
    }

    async createInstance(instanceName: string, config?: any): Promise<InstanceResult> {
        const sessionName = 'default';
        try {
            try {
                await this.request<WahaSessionResponse>('POST', '/api/sessions', {
                    name: sessionName,
                    config: { proxy: null, webhooks: [] },
                });
                this.logger.log(`Created WAHA session: ${sessionName}`);
            } catch (error: any) {
                if (error.message?.includes('already exists')) {
                    this.logger.log(`Session '${sessionName}' already exists`);
                } else {
                    throw error;
                }
            }
            try {
                await this.request('POST', `/api/sessions/${sessionName}/start`);
                this.logger.log(`Started WAHA session: ${sessionName}`);
            } catch (e) { }
            return {
                instanceId: sessionName,
                displayName: instanceName,
                provider: 'waha',
            };
        } catch (error: any) {
            this.logger.error(`Failed to create WAHA instance: ${error.message}`);
            throw error;
        }
    }

    async getQrCode(instanceName: string): Promise<string> {
        const sessionName = 'default';
        try { await this.request('POST', `/api/sessions/${sessionName}/start`); } catch (e) { }
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
                    if (data.value) return `data:${data.mimetype || 'image/png'};base64,${data.value}`;
                    if (data.base64) return data.base64;
                }
                return '';
            } catch (error: any) {
                if (error.message?.includes('STARTING') || error.message?.includes('Try again')) {
                    await this.sleep(retryDelay);
                    continue;
                }
                throw error;
            }
        }
        return '';
    }

    async getStatus(instanceName: string): Promise<InstanceStatus> {
        try {
            const response = await this.request<WahaSessionResponse>('GET', `/api/sessions/default`);
            return {
                status: this.mapStatus(response.status),
                phoneNumber: response.me?.id,
                name: response.me?.pushname,
            };
        } catch (error) {
            return { status: EnumInstanceStatus.DISCONNECTED };
        }
    }

    async deleteInstance(instanceName: string): Promise<void> {
        try { await this.request('POST', `/api/sessions/default/stop`); } catch (e) { }
    }

    async sendText(instanceName: string, to: string, text: string): Promise<SendMessageResult> {
        const response = await this.request<WahaSendTextResponse>('POST', `/api/default/sendText`, {
            chatId: this.formatJid(to),
            text,
        });
        return {
            messageId: response.id || response.key?.id || 'unknown',
            status: 'sent',
        };
    }

    async sendMedia(instanceName: string, to: string, media: {
        type: 'image' | 'video' | 'audio' | 'document';
        url: string;
        caption?: string;
        filename?: string;
    }): Promise<SendMessageResult> {
        // WAHA uses sendFile endpoint for media
        const response = await this.request<WahaSendTextResponse>('POST', `/api/default/sendFile`, {
            chatId: this.formatJid(to),
            file: {
                mimetype: media.type === 'video' ? 'video/mp4' : media.type === 'audio' ? 'audio/mpeg' : media.type === 'image' ? 'image/jpeg' : 'application/pdf',
                url: media.url,
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

    async sendPresence(
        instanceName: string,
        to: string,
        presence: 'composing' | 'recording' | 'paused',
        durationMs: number,
    ): Promise<void> {
        try {
            const endpoint = presence === 'paused' ? `/api/default/stopTyping` : `/api/default/startTyping`;
            await this.request('POST', endpoint, { chatId: this.formatJid(to) });
            if (presence !== 'paused') {
                await this.sleep(durationMs);
                await this.request('POST', `/api/default/stopTyping`, { chatId: this.formatJid(to) });
            }
        } catch (error: any) {
            this.logger.warn(`Failed to send presence: ${error.message}`);
        }
    }

    async isOnWhatsApp(instanceName: string, phone: string): Promise<boolean> {
        try {
            const response = await this.request<WahaCheckNumberResponse[]>('POST', `/api/default/contacts/check`, {
                phone: [this.formatPhone(phone)],
            });
            return response[0]?.isRegistered || false;
        } catch (error) {
            return true;
        }
    }

    private async request<T = any>(method: string, path: string, body?: any): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey },
        };
        if (body) options.body = JSON.stringify(body);
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WAHA API error: ${response.status} - ${errorText}`);
        }
        return response.json() as Promise<T>;
    }

    private formatJid(phone: string): string {
        return `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    }

    private formatPhone(phone: string): string {
        return phone.replace(/\D/g, '');
    }

    private mapStatus(wahaStatus: string): EnumInstanceStatus {
        const map: Record<string, EnumInstanceStatus> = {
            'WORKING': EnumInstanceStatus.CONNECTED,
            'SCAN_QR_CODE': EnumInstanceStatus.QR_PENDING,
            'STARTING': EnumInstanceStatus.CONNECTING,
            'STOPPED': EnumInstanceStatus.DISCONNECTED,
            'FAILED': EnumInstanceStatus.ERROR,
        };
        return map[wahaStatus] || EnumInstanceStatus.DISCONNECTED;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
