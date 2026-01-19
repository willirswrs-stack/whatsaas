
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IWhatsAppProvider,
    InstanceResult,
    InstanceStatus,
    SendMessageResult,
} from '../whatsapp-provider.interface';
import { InstanceStatus as EnumInstanceStatus } from '../../../common/enums/instance-status.enum';

/**
 * Evolution API v2 Adapter
 * Implements IWhatsAppProvider for Evolution API
 */
@Injectable()
export class EvolutionAdapter implements IWhatsAppProvider {
    readonly providerType = 'evolution' as const;
    private readonly logger = new Logger(EvolutionAdapter.name);
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly requestTimeout: number = 60000;

    constructor(private configService: ConfigService) {
        this.baseUrl = configService.get('EVOLUTION_API_URL', 'http://localhost:8081');
        this.apiKey = configService.get('EVOLUTION_API_KEY', '');
        this.logger.log(`Evolution API configured: ${this.baseUrl}`);
    }

    async createInstance(instanceName: string): Promise<InstanceResult> {
        try {
            // Check if instance already exists
            const existingInstances = await this.request('GET', '/instance/fetchInstances');
            const existing = existingInstances?.find?.((i: any) => i.name === instanceName);

            if (existing) {
                this.logger.log(`Instance '${instanceName}' already exists, reusing`);
                return {
                    instanceId: existing.name,
                    displayName: instanceName,
                    provider: 'evolution',
                };
            }

            // Create new instance WITHOUT qrcode initially (faster)
            const response = await this.request('POST', '/instance/create', {
                instanceName,
                qrcode: false,
                integration: 'WHATSAPP-BAILEYS',
            });

            this.logger.log(`Created Evolution instance: ${instanceName}`);

            return {
                instanceId: response.instance?.instanceName || instanceName,
                displayName: instanceName,
                provider: 'evolution',
            };
        } catch (error: any) {
            // Idempotency: if already exists, return successful reference
            if (error.message?.includes('already') || error.message?.includes('409')) {
                this.logger.log(`Instance '${instanceName}' already exists (caught error)`);
                return {
                    instanceId: instanceName,
                    displayName: instanceName,
                    provider: 'evolution',
                };
            }
            this.logger.error(`Failed to create Evolution instance: ${error.message}`);
            throw error;
        }
    }

    async getQrCode(instanceName: string): Promise<string> {
        const maxRetries = 10;
        const retryDelay = 2000;

        this.logger.log(`Fetching QR Code for instance: ${instanceName}`);

        for (let i = 0; i < maxRetries; i++) {
            try {
                // Evolution API: GET /instance/connect/{instanceName}
                const response = await this.request('GET', `/instance/connect/${instanceName}`);

                this.logger.debug(`QR response (attempt ${i + 1}): ${JSON.stringify(response).substring(0, 100)}...`);

                // Logica de extração de QR
                if (response.base64 && response.base64.startsWith('data:image')) {
                    return response.base64;
                }
                if (response.qrcode?.base64) {
                    const base64 = response.qrcode.base64;
                    return base64.startsWith('data:image') ? base64 : `data:image/png;base64,${base64}`;
                }
                if (response.qrcode?.code || response.code) {
                    return `qr:${response.qrcode?.code || response.code}`;
                }

                // QR not ready
                if (response.count === 0 || response.qrcode?.count === 0) {
                    await this.sleep(retryDelay);
                    continue;
                }

                await this.sleep(retryDelay);
            } catch (error: any) {
                this.logger.error(`QR Fetch Error (${i + 1}/${maxRetries}): ${error.message}`);

                // Fallback: se já estiver conectado, retornar vazio (sucesso implícito)
                if (i === maxRetries - 1) {
                    try {
                        const state = await this.getStatus(instanceName);
                        if (state.status === EnumInstanceStatus.CONNECTED) {
                            return '';
                        }
                    } catch (e) { }
                }

                if (i < maxRetries - 1) {
                    await this.sleep(retryDelay);
                    continue;
                }
                throw error;
            }
        }

        this.logger.warn('QR Code fetch timeout');
        return '';
    }

    async getStatus(instanceName: string): Promise<InstanceStatus> {
        try {
            const response = await this.request('GET', `/instance/connectionState/${instanceName}`);
            const state = response.instance?.state || response.state;

            return {
                status: this.mapStatus(state),
                phoneNumber: response.instance?.wuid || response.instance?.ownerJid,
                name: response.instance?.profileName,
            };
        } catch (error: any) {
            this.logger.warn(`Failed to get status for ${instanceName}: ${error.message}`);
            return { status: EnumInstanceStatus.DISCONNECTED };
        }
    }

    async deleteInstance(instanceName: string): Promise<void> {
        try {
            await this.request('DELETE', `/instance/logout/${instanceName}`);
        } catch (e) { }

        try {
            await this.request('DELETE', `/instance/delete/${instanceName}`);
            this.logger.log(`Deleted Evolution instance: ${instanceName}`);
        } catch (error: any) {
            if (error.message?.includes('404') || error.message?.includes('not found')) {
                return;
            }
            throw error;
        }
    }

    async sendText(instanceName: string, to: string, text: string): Promise<SendMessageResult> {
        const response = await this.request('POST', `/message/sendText/${instanceName}`, {
            number: this.formatPhone(to),
            text,
        });

        return {
            messageId: response.key?.id || 'unknown',
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
            await this.request('POST', `/chat/presence/${instanceName}`, {
                number: this.formatPhone(to),
                presence: presence === 'paused' ? 'paused' : presence,
            });

            if (presence !== 'paused' && durationMs > 0) {
                await this.sleep(durationMs);
                await this.request('POST', `/chat/presence/${instanceName}`, {
                    number: this.formatPhone(to),
                    presence: 'paused',
                });
            }
        } catch (error: any) {
            this.logger.warn(`Failed to send presence: ${error.message}`);
        }
    }

    async isOnWhatsApp(instanceName: string, phone: string): Promise<boolean> {
        try {
            const response = await this.request(
                'POST',
                `/chat/whatsappNumbers/${instanceName}`,
                { numbers: [this.formatPhone(phone)] },
            );
            return response[0]?.exists || response[0]?.jid !== undefined;
        } catch (error) {
            return true;
        }
    }

    private async request(method: string, path: string, body?: any): Promise<any> {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': this.apiKey,
            },
            signal: controller.signal,
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
            }

            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Evolution API timeout after ${this.requestTimeout}ms`);
            }
            throw error;
        }
    }

    private formatPhone(phone: string): string {
        return phone.replace(/\D/g, '');
    }

    private mapStatus(evolutionState: string): EnumInstanceStatus {
        if (!evolutionState) return EnumInstanceStatus.DISCONNECTED;

        const s = evolutionState.toLowerCase();

        if (s === 'open') return EnumInstanceStatus.CONNECTED;
        if (s === 'connecting') return EnumInstanceStatus.CONNECTING;
        if (s === 'close') return EnumInstanceStatus.DISCONNECTED;
        if (s === 'qrcode') return EnumInstanceStatus.QR_PENDING;

        return EnumInstanceStatus.DISCONNECTED;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
