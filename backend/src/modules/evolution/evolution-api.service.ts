import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EvolutionApiService {
    private readonly logger = new Logger(EvolutionApiService.name);
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor(private configService: ConfigService) {
        // WAHA API está na porta 8080
        this.baseUrl = configService.get('WAHA_API_URL', 'http://localhost:8080');
        this.apiKey = configService.get('WAHA_API_KEY', '');
    }

    /**
     * Create a new WhatsApp session (WAHA API)
     * NOTA: WAHA Core (gratuito) só suporta a sessão 'default'
     * Para múltiplas sessões, use WAHA PLUS
     */
    async createInstance(instanceName: string): Promise<any> {
        // WAHA Core só suporta sessão 'default'
        const sessionName = 'default';

        try {
            // Tentar criar a sessão default (vai falhar se já existir)
            try {
                await this.request('POST', '/api/sessions', {
                    name: sessionName,
                    config: {
                        proxy: null,
                        webhooks: [],
                    },
                });
                this.logger.log(`Created session: ${sessionName}`);
            } catch (createError: any) {
                // Ignorar erro se a sessão já existir
                if (createError.message?.includes('already exists')) {
                    this.logger.log(`Session '${sessionName}' already exists, using existing`);
                } else {
                    throw createError;
                }
            }

            // Iniciar a sessão se não estiver iniciada
            try {
                await this.request('POST', `/api/sessions/${sessionName}/start`);
                this.logger.log(`Started session: ${sessionName}`);
            } catch (startError: any) {
                // Ignorar erro se já estiver iniciada
                this.logger.debug(`Session start response: ${startError.message}`);
            }

            // Retornar referência à sessão (usando instanceName para UI, mas sessionName real)
            return {
                instance: {
                    instanceId: sessionName,
                    displayName: instanceName
                }
            };
        } catch (error: any) {
            this.logger.error(`Failed to create instance: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get QR Code for session - WAHA API
     * NOTA: WAHA Core só suporta sessão 'default'
     */
    async getQrCode(instanceName: string): Promise<string> {
        // WAHA Core só suporta sessão 'default'
        const sessionName = 'default';

        try {
            // Primeiro, iniciar a sessão se não estiver iniciada
            try {
                await this.request('POST', `/api/sessions/${sessionName}/start`);
            } catch (e) {
                // Ignorar erro se já estiver iniciada
            }

            // Aguardar a sessão entrar em estado SCAN_QR_CODE (retry com delay)
            const maxRetries = 10;
            const retryDelay = 2000; // 2 segundos

            for (let i = 0; i < maxRetries; i++) {
                try {
                    // WAHA API: GET /api/:session/auth/qr
                    const response = await this.request('GET', `/api/${sessionName}/auth/qr`);

                    // WAHA retorna { value: "base64...", mimetype: "..." }
                    if (response.value) {
                        return `data:${response.mimetype || 'image/png'};base64,${response.value}`;
                    }
                    if (response.base64) {
                        return response.base64;
                    }

                    this.logger.warn(`No QR code in response: ${JSON.stringify(response)}`);
                    return '';
                } catch (qrError: any) {
                    // Se a sessão ainda está iniciando, aguardar e tentar novamente
                    if (qrError.message?.includes('STARTING') || qrError.message?.includes('Try again')) {
                        this.logger.log(`Session still starting, retry ${i + 1}/${maxRetries}...`);
                        await this.sleep(retryDelay);
                        continue;
                    }
                    throw qrError;
                }
            }

            throw new Error('Timeout waiting for QR Code - session did not enter SCAN_QR_CODE state');
        } catch (error: any) {
            this.logger.error(`Failed to get QR code: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get session connection status (WAHA API)
     */
    async getInstanceStatus(instanceName: string): Promise<any> {
        const response = await this.request('GET', `/api/sessions/${instanceName}`);
        return response;
    }

    /**
     * Send presence (composing, recording, paused) - WAHA API
     */
    async sendPresence(
        instanceName: string,
        to: string,
        presence: 'composing' | 'recording' | 'paused',
        duration: number,
    ): Promise<void> {
        // WAHA Core só suporta sessão 'default'
        const sessionName = 'default';

        try {
            // WAHA API: POST /api/:session/startTyping or stopTyping
            const endpoint = presence === 'paused'
                ? `/api/${sessionName}/stopTyping`
                : `/api/${sessionName}/startTyping`;

            await this.request('POST', endpoint, {
                chatId: this.formatJid(to),
            });

            // Manter presença pelo tempo especificado
            if (presence !== 'paused') {
                await this.sleep(duration);
                await this.request('POST', `/api/${sessionName}/stopTyping`, {
                    chatId: this.formatJid(to),
                });
            }
        } catch (error) {
            this.logger.warn(`Failed to send presence: ${error.message}`);
        }
    }

    /**
     * Send text message - WAHA API
     */
    async sendText(
        instanceName: string,
        to: string,
        text: string,
        proxyUrl?: string,
    ): Promise<any> {
        // WAHA Core só suporta sessão 'default'
        const sessionName = 'default';

        this.logger.log(`📤 Sending message to ${to} via ${sessionName}`);

        // WAHA API: POST /api/sendText (session no body, não na URL)
        const response = await this.request(
            'POST',
            `/api/sendText`,
            {
                session: sessionName,
                chatId: this.formatJid(to),
                text,
            },
        );

        this.logger.log(`✅ Message sent successfully`);
        return response;
    }

    /**
     * Send media message (image, video, audio, document)
     */
    async sendMedia(
        instanceName: string,
        to: string,
        mediaType: 'image' | 'video' | 'audio' | 'document',
        mediaUrl: string,
        caption?: string,
    ): Promise<any> {
        const payload: any = {
            number: this.formatPhone(to),
            media: mediaUrl,
            mimetype: this.getMimeType(mediaType),
        };

        if (caption) {
            payload.caption = caption;
        }

        const response = await this.request(
            'POST',
            `/message/sendMedia/${instanceName}`,
            payload,
        );

        return response;
    }

    /**
     * Send audio message (voice note)
     */
    async sendAudio(
        instanceName: string,
        to: string,
        audioBuffer: Buffer,
    ): Promise<any> {
        const payload = {
            number: this.formatPhone(to),
            audio: audioBuffer.toString('base64'),
            encoding: true,
        };

        return this.request('POST', `/message/sendWhatsAppAudio/${instanceName}`, payload);
    }

    /**
     * Check if number is on WhatsApp
     */
    async isOnWhatsApp(instanceName: string, phone: string): Promise<boolean> {
        try {
            const response = await this.request(
                'POST',
                `/chat/whatsappNumbers/${instanceName}`,
                { numbers: [this.formatPhone(phone)] },
            );
            return response[0]?.exists || false;
        } catch (error) {
            this.logger.warn(`Failed to check WhatsApp: ${error.message}`);
            return true; // Assume exists on error
        }
    }

    /**
     * Delete/logout session - WAHA API
     */
    async deleteInstance(instanceName: string): Promise<void> {
        try {
            // WAHA API: First stop, then delete
            await this.request('POST', `/api/sessions/${instanceName}/stop`);
        } catch (e) {
            // Ignore stop errors
        }
        await this.request('DELETE', `/api/sessions/${instanceName}`);
    }

    /**
     * Set webhook for instance
     */
    async setWebhook(instanceName: string, webhookUrl: string): Promise<void> {
        await this.request('POST', `/webhook/set/${instanceName}`, {
            webhook: {
                enabled: true,
                url: webhookUrl,
                events: [
                    'QRCODE_UPDATED',
                    'CONNECTION_UPDATE',
                    'MESSAGES_UPSERT',
                    'MESSAGES_UPDATE',
                    'SEND_MESSAGE',
                ],
            },
        });
    }

    /**
     * Internal request method
     */
    private async request(
        method: string,
        path: string,
        body?: any,
    ): Promise<any> {
        const url = `${this.baseUrl}${path}`;

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': this.apiKey,  // WAHA uses X-Api-Key header
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        this.logger.debug(`${method} ${path}`);

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * Format phone number to WhatsApp JID
     */
    private formatJid(phone: string): string {
        const cleaned = phone.replace(/\D/g, '');
        return `${cleaned}@s.whatsapp.net`;
    }

    /**
     * Format phone number
     */
    private formatPhone(phone: string): string {
        return phone.replace(/\D/g, '');
    }

    /**
     * Get mime type for media
     */
    private getMimeType(type: string): string {
        const mimeTypes: Record<string, string> = {
            image: 'image/jpeg',
            video: 'video/mp4',
            audio: 'audio/mp3',
            document: 'application/pdf',
        };
        return mimeTypes[type] || 'application/octet-stream';
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get contacts from the WAHA API instance
     */
    async getContacts(instanceName: string): Promise<any[]> {
        // WAHA Core só suporta sessão 'default'
        const sessionName = 'default';

        try {
            this.logger.log(`Fetching contacts from WAHA API session: ${sessionName}`);
            // GET /api/${sessionName}/contacts
            const response = await this.request('GET', `/api/${sessionName}/contacts`);
            
            // Expected response format from WAHA:
            // Array of objects, each containing an 'id' and optionally a 'name' or 'pushName'
            if (Array.isArray(response)) {
                return response;
            } else if (response && Array.isArray(response.contacts)) {
                return response.contacts;
            } else if (response && Array.isArray(response.data)) {
                return response.data;
            }
            
            this.logger.warn(`Unexpected format for contacts response: ${JSON.stringify(response).substring(0, 200)}`);
            return [];
        } catch (error) {
            this.logger.error(`Failed to get contacts: ${error.message}`);
            throw error;
        }
    }
}
