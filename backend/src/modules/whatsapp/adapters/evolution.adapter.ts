
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
    private readonly requestTimeout: number = 120000;

    constructor(private configService: ConfigService) {
        this.baseUrl = configService.get('EVOLUTION_API_URL', 'http://localhost:8081');
        this.apiKey = configService.get('EVOLUTION_API_KEY', '');
        this.logger.log(`Evolution API configured: ${this.baseUrl}`);
    }

    async createInstance(instanceName: string, config?: any): Promise<InstanceResult> {
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

            // Determine integration type (Official API vs Baileys/Web)
            const isOfficial = !!config?.token || !!config?.accessToken;
            const integration = isOfficial ? 'WHATSAPP-BUSINESS' : 'WHATSAPP-BAILEYS';

            const payload: any = {
                instanceName,
                qrcode: !isOfficial,
                integration,
            };

            if (isOfficial) {
                payload.token = config?.token || config?.accessToken;
                payload.number = config?.phoneNumber || config?.phoneNumberId; // A Evolution usa 'number' mas na WABA é o Phone Number ID
                
                // Mapeia o Business Account ID se fornecido
                if (config?.wabaId) {
                    payload.businessId = config.wabaId;
                }
            }

            // Create new instance
            const response = await this.request('POST', '/instance/create', payload);

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

    async getPairingCode(instanceName: string, phoneNumber: string): Promise<{ pairingCode: string; phone: string }> {
        const maxRetries = 10;
        const retryDelay = 2500;
        const formatted = phoneNumber.replace(/\D/g, '');

        let alternate: string | null = null;
        if (formatted.startsWith('55') && formatted.length === 13) {
            const ddd = formatted.substring(2, 4);
            const eighthDigitStart = formatted.substring(5);
            alternate = `55${ddd}${eighthDigitStart}`;
        } else if (formatted.startsWith('55') && formatted.length === 12) {
            const ddd = formatted.substring(2, 4);
            const rest = formatted.substring(4);
            alternate = `55${ddd}9${rest}`;
        }

        const phoneNumbersToTry = [formatted];
        if (alternate) {
            phoneNumbersToTry.push(alternate);
        }

        this.logger.log(`Generating pairing code for ${instanceName} using phone primary: ${formatted}${alternate ? `, alternate: ${alternate}` : ''}`);

        const isValidPairingCode = (code: any): boolean => {
            if (typeof code !== 'string') return false;
            const clean = code.replace(/[^A-Za-z0-9]/g, '');
            return clean.length === 8;
        };

        const extractPairingCode = (res: any): string | null => {
            if (!res) return null;
            const candidates = [
                res.pairingCode,
                res.code,
                res.qrcode?.pairingCode,
                res.qrcode?.code
            ];
            for (const cand of candidates) {
                if (isValidPairingCode(cand)) {
                    return cand.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                }
            }
            return null;
        };

        for (let i = 0; i < maxRetries; i++) {
            for (const phone of phoneNumbersToTry) {
                try {
                    this.logger.log(`Attempting to generate pairing code for ${instanceName} using phone ${phone} (attempt ${i + 1}/${maxRetries})`);
                    const response = await this.request('GET', `/instance/connect/${instanceName}?number=${phone}`);
                    
                    this.logger.debug(`Pairing Code response for ${phone} (attempt ${i + 1}): ${JSON.stringify(response).substring(0, 100)}...`);

                    const code = extractPairingCode(response);
                    if (code) {
                        this.logger.log(`Successfully generated pairing code for ${instanceName} using phone ${phone} on attempt ${i + 1}: ${code}`);
                        return { pairingCode: code, phone };
                    }
                    
                    this.logger.log(`Pairing code not ready yet for ${instanceName} with phone ${phone} on attempt ${i + 1}.`);
                } catch (error: any) {
                    this.logger.warn(`Pairing Code Fetch Error for phone ${phone} (${i + 1}/${maxRetries}): ${error.message}`);
                }
            }
            
            if (i < maxRetries - 1) {
                await this.sleep(retryDelay);
            }
        }

        throw new Error('Código de pareamento não gerado a tempo. Certifique-se de que o número de telefone está ativo no WhatsApp e tente novamente.');
    }

    async getStatus(instanceName: string): Promise<InstanceStatus> {
        try {
            const response = await this.request('GET', `/instance/connectionState/${instanceName}`);
            const state = response.instance?.state || response.state;

            let phoneNumber = response.instance?.owner || response.instance?.ownerJid || response.instance?.phoneNumber || response.instance?.wuid || response.owner;
            
            // 🔥 FALLBACK: Em algumas versões v2 da Evolution, connectionState NÃO retorna o proprietário.
            // Se não obtivemos o número, puxamos a lista geral e filtramos pelo nome da instância.
            if (!phoneNumber && this.mapStatus(state) === EnumInstanceStatus.CONNECTED) {
                try {
                    const allInstances = await this.request('GET', '/instance/fetchInstances');
                    const matched = Array.isArray(allInstances) 
                        ? allInstances.find((i: any) => i.name === instanceName || i.instanceName === instanceName) 
                        : null;
                    
                    if (matched) {
                        phoneNumber = matched.ownerJid || matched.number || matched.owner;
                        this.logger.log(`Fallback phoneNumber recovery success for ${instanceName}: ${phoneNumber}`);
                    }
                } catch (fallbackErr) {
                    this.logger.warn(`Fallback recovery failed: ${fallbackErr.message}`);
                }
            }

            return {
                status: this.mapStatus(state),
                phoneNumber,
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

    async sendMedia(instanceName: string, to: string, media: {
        type: 'image' | 'video' | 'audio' | 'document';
        url: string;
        caption?: string;
        filename?: string;
    }): Promise<SendMessageResult> {
        // 🔥 CRÍTICO: Para Evolution v2, áudios reais (PTT/Mensagem de Voz) 
        // DEVEM usar o endpoint específico /message/sendWhatsAppAudio
        if (media.type === 'audio') {
            const response = await this.request('POST', `/message/sendWhatsAppAudio/${instanceName}`, {
                number: this.formatPhone(to),
                audio: media.url,
                options: {
                    delay: 1000, // Pequena simulação nativa
                    presence: 'recording',
                    encoding: true, // Indica que o áudio enviado é uma string base64 pura
                },
            });

            this.logger.log(`Sent WhatsApp Voice Note (PTT) to ${to} via Evolution API`);

            return {
                messageId: response.key?.id || 'unknown',
                status: 'sent',
            };
        }

        // Fallback para outras mídias (Imagens, Documentos, Vídeos)
        const extension = media.url.split('.').pop()?.split('?')[0] || (media.type === 'video' ? 'mp4' : media.type === 'image' ? 'jpg' : 'pdf');

        const response = await this.request('POST', `/message/sendMedia/${instanceName}`, {
            number: this.formatPhone(to),
            mediatype: media.type,
            media: media.url,
            caption: media.caption || '',
            fileName: media.filename || `file.${extension}`,
        });

        this.logger.log(`Sent ${media.type} to ${to} via Evolution API`);

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
            await this.request('POST', `/chat/presenceUpdate/${instanceName}`, {
                number: this.formatPhone(to),
                presence: presence === 'paused' ? 'paused' : presence,
            });

            if (presence !== 'paused' && durationMs > 0) {
                await this.sleep(durationMs);
                await this.request('POST', `/chat/presenceUpdate/${instanceName}`, {
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
            const formatted = this.formatPhone(phone);
            // Evolution API v2: POST /chat/whatsappNumbers/{instance} with body { numbers: ["55..."] }
            const response = await this.request('POST', `/chat/whatsappNumbers/${instanceName}`, {
                numbers: [formatted]
            });

            // Response is array of objects: [{ number: '...', exists: true, jid: '...' }]
            if (Array.isArray(response) && response.length > 0) {
                return response[0].exists === true;
            }

            return false;
        } catch (error) {
            this.logger.error(`Error checking if ${phone} is on WhatsApp: ${error.message}`);
            // If API fails, we assume true to allow trying to send (false negative is worse than false positive here?)
            // OR we assume false to be safe? 
            // Better to return false if we want strict filtering as requested by user.
            return false;
        }
    }

    async getMaturityMetrics(instanceName: string): Promise<{ chatCount: number; groupCount: number }> {
        try {
            // POST /chat/findChats/{instance} body {} to get ALL chats from cache/db
            const chats = await this.request('POST', `/chat/findChats/${instanceName}`, {});
            
            if (!Array.isArray(chats)) {
                return { chatCount: 0, groupCount: 0 };
            }

            const groupCount = chats.filter((c: any) => {
                const jid = c.remoteJid || c.id || '';
                return jid.endsWith('@g.us');
            }).length;

            const chatCount = chats.length - groupCount;

            this.logger.log(`Maturity Metrics for ${instanceName}: ${chatCount} private chats, ${groupCount} groups`);

            return { chatCount, groupCount };
        } catch (error: any) {
            this.logger.error(`Failed to scan maturity for ${instanceName}: ${error.message}`);
            return { chatCount: 0, groupCount: 0 };
        }
    }

    async joinGroup(instanceName: string, inviteUrl: string): Promise<any> {
        try {
            this.logger.log(`[Evolution] Joining group via invite: ${inviteUrl} for instance ${instanceName}`);
            // Fornecemos chaves alternativas para cobrir variações da API Evolution v1/v2
            return await this.request('POST', `/group/joinByInvite/${instanceName}`, {
                inviteUrl: inviteUrl,
                invite: inviteUrl,
            });
        } catch (error: any) {
            this.logger.error(`Failed to join group for ${instanceName}: ${error.message}`);
            throw error;
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
