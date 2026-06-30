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
var EvolutionAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvolutionAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const instance_status_enum_1 = require("../../../common/enums/instance-status.enum");
/**
 * Evolution API v2 Adapter
 * Implements IWhatsAppProvider for Evolution API
 */
let EvolutionAdapter = EvolutionAdapter_1 = class EvolutionAdapter {
    configService;
    providerType = 'evolution';
    logger = new common_1.Logger(EvolutionAdapter_1.name);
    baseUrl;
    apiKey;
    requestTimeout = 120000;
    constructor(configService) {
        this.configService = configService;
        this.baseUrl = configService.get('EVOLUTION_API_URL', 'http://localhost:8081');
        this.apiKey = configService.get('EVOLUTION_API_KEY', '');
        this.logger.log(`Evolution API configured: ${this.baseUrl}`);
    }
    async createInstance(instanceName, config) {
        try {
            // Check if instance already exists
            const existingInstances = await this.request('GET', '/instance/fetchInstances');
            const existing = existingInstances?.find?.((i) => i.name === instanceName);
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
            const payload = {
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
        }
        catch (error) {
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
    async getQrCode(instanceName) {
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
            }
            catch (error) {
                this.logger.error(`QR Fetch Error (${i + 1}/${maxRetries}): ${error.message}`);
                // Fallback: se já estiver conectado, retornar vazio (sucesso implícito)
                if (i === maxRetries - 1) {
                    try {
                        const state = await this.getStatus(instanceName);
                        if (state.status === instance_status_enum_1.InstanceStatus.CONNECTED) {
                            return '';
                        }
                    }
                    catch (e) { }
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
    async getPairingCode(instanceName, phoneNumber) {
        const maxRetries = 10;
        const retryDelay = 2500;
        const formatted = phoneNumber.replace(/\D/g, '');
        let alternate = null;
        if (formatted.startsWith('55') && formatted.length === 13) {
            const ddd = formatted.substring(2, 4);
            const eighthDigitStart = formatted.substring(5);
            alternate = `55${ddd}${eighthDigitStart}`;
        }
        else if (formatted.startsWith('55') && formatted.length === 12) {
            const ddd = formatted.substring(2, 4);
            const rest = formatted.substring(4);
            alternate = `55${ddd}9${rest}`;
        }
        const phoneNumbersToTry = [formatted];
        if (alternate) {
            phoneNumbersToTry.push(alternate);
        }
        this.logger.log(`Generating pairing code for ${instanceName} using phone primary: ${formatted}${alternate ? `, alternate: ${alternate}` : ''}`);
        const isValidPairingCode = (code) => {
            if (typeof code !== 'string')
                return false;
            const clean = code.replace(/[^A-Za-z0-9]/g, '');
            return clean.length === 8;
        };
        const extractPairingCode = (res) => {
            if (!res)
                return null;
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
                }
                catch (error) {
                    this.logger.warn(`Pairing Code Fetch Error for phone ${phone} (${i + 1}/${maxRetries}): ${error.message}`);
                }
            }
            if (i < maxRetries - 1) {
                await this.sleep(retryDelay);
            }
        }
        throw new Error('Código de pareamento não gerado a tempo. Certifique-se de que o número de telefone está ativo no WhatsApp e tente novamente.');
    }
    async getStatus(instanceName) {
        try {
            const response = await this.request('GET', `/instance/connectionState/${instanceName}`);
            const state = response.instance?.state || response.state;
            let phoneNumber = response.instance?.owner || response.instance?.ownerJid || response.instance?.phoneNumber || response.instance?.wuid || response.owner;
            // 🔥 FALLBACK: Em algumas versões v2 da Evolution, connectionState NÃO retorna o proprietário.
            // Se não obtivemos o número, puxamos a lista geral e filtramos pelo nome da instância.
            if (!phoneNumber && this.mapStatus(state) === instance_status_enum_1.InstanceStatus.CONNECTED) {
                try {
                    const allInstances = await this.request('GET', '/instance/fetchInstances');
                    const matched = Array.isArray(allInstances)
                        ? allInstances.find((i) => i.name === instanceName || i.instanceName === instanceName)
                        : null;
                    if (matched) {
                        phoneNumber = matched.ownerJid || matched.number || matched.owner;
                        this.logger.log(`Fallback phoneNumber recovery success for ${instanceName}: ${phoneNumber}`);
                    }
                }
                catch (fallbackErr) {
                    this.logger.warn(`Fallback recovery failed: ${fallbackErr.message}`);
                }
            }
            return {
                status: this.mapStatus(state),
                phoneNumber,
                name: response.instance?.profileName,
                exists: true,
            };
        }
        catch (error) {
            this.logger.warn(`Failed to get status for ${instanceName}: ${error.message}`);
            const isNotFound = error.message?.includes('404') || error.message?.includes('not exist');
            return {
                status: instance_status_enum_1.InstanceStatus.DISCONNECTED,
                exists: !isNotFound,
            };
        }
    }
    async deleteInstance(instanceName) {
        try {
            await this.request('DELETE', `/instance/logout/${instanceName}`);
        }
        catch (e) { }
        try {
            await this.request('DELETE', `/instance/delete/${instanceName}`);
            this.logger.log(`Deleted Evolution instance: ${instanceName}`);
        }
        catch (error) {
            if (error.message?.includes('404') || error.message?.includes('not found')) {
                return;
            }
            throw error;
        }
    }
    async sendText(instanceName, to, text) {
        const resolvedNumber = await this.resolveAndValidateNumber(instanceName, to);
        if (!resolvedNumber)
            throw new Error(`Number ${to} is not registered on WhatsApp`);
        const response = await this.request('POST', `/message/sendText/${instanceName}`, {
            number: resolvedNumber,
            text,
        });
        return {
            messageId: response.key?.id || 'unknown',
            status: 'sent',
        };
    }
    async sendMedia(instanceName, to, media) {
        // 🔥 CRÍTICO: Para Evolution v2, áudios reais (PTT/Mensagem de Voz) 
        // DEVEM usar o endpoint específico /message/sendWhatsAppAudio
        const resolvedNumber = await this.resolveAndValidateNumber(instanceName, to);
        if (!resolvedNumber)
            throw new Error(`Number ${to} is not registered on WhatsApp`);
        if (media.type === 'audio') {
            const response = await this.request('POST', `/message/sendWhatsAppAudio/${instanceName}`, {
                number: resolvedNumber,
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
            number: resolvedNumber,
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
    async sendPresence(instanceName, to, presence, durationMs) {
        try {
            const resolvedNumber = await this.resolveAndValidateNumber(instanceName, to);
            if (!resolvedNumber)
                return;
            await this.request('POST', `/chat/sendPresence/${instanceName}`, {
                number: resolvedNumber,
                presence: presence === 'paused' ? 'paused' : presence,
                delay: durationMs || 0,
            });
        }
        catch (error) {
            this.logger.warn(`Failed to send presence: ${error.message}`);
        }
    }
    async isOnWhatsApp(instanceName, phone) {
        const resolved = await this.resolveAndValidateNumber(instanceName, phone);
        return !!resolved;
    }
    async resolveAndValidateNumber(instanceName, phone) {
        if (phone.includes('@g.us')) {
            return phone;
        }
        try {
            const formatted = this.formatPhone(phone);
            const response = await this.request('POST', `/chat/whatsappNumbers/${instanceName}`, {
                numbers: [formatted]
            });
            if (Array.isArray(response) && response.length > 0) {
                const info = response[0];
                if (info.exists === true) {
                    // Extract the exact jid without @s.whatsapp.net to ensure delivery
                    if (info.jid) {
                        return info.jid.replace('@s.whatsapp.net', '');
                    }
                    return info.number || formatted;
                }
                // --- 9TH DIGIT FALLBACK FOR BRAZILIAN NUMBERS ---
                // Se a API disse que não existe, pode ser porque o WhatsApp removeu/adicionou o 9º dígito.
                if (formatted.startsWith('55')) {
                    let fallbackNumber = null;
                    // Se tem 13 dígitos (com o 9), tenta sem o 9
                    if (formatted.length === 13 && formatted[4] === '9') {
                        fallbackNumber = formatted.substring(0, 4) + formatted.substring(5);
                    }
                    // Se tem 12 dígitos (sem o 9), tenta com o 9
                    else if (formatted.length === 12) {
                        fallbackNumber = formatted.substring(0, 4) + '9' + formatted.substring(4);
                    }
                    if (fallbackNumber) {
                        this.logger.log(`Number ${formatted} not found on WhatsApp. Trying fallback format ${fallbackNumber}...`);
                        try {
                            const fallbackResponse = await this.request('POST', `/chat/whatsappNumbers/${instanceName}`, {
                                numbers: [fallbackNumber]
                            });
                            if (Array.isArray(fallbackResponse) && fallbackResponse.length > 0) {
                                const fallbackInfo = fallbackResponse[0];
                                if (fallbackInfo.exists === true) {
                                    this.logger.log(`Fallback successful! Using ${fallbackInfo.number || fallbackNumber}`);
                                    if (fallbackInfo.jid) {
                                        return fallbackInfo.jid.replace('@s.whatsapp.net', '');
                                    }
                                    return fallbackInfo.number || fallbackNumber;
                                }
                            }
                        }
                        catch (fallbackError) {
                            // Ignorar erro do fallback e retornar null
                        }
                    }
                }
                return null; // Doesn't exist
            }
            // Fallback just in case endpoint fails to return expected array
            return null;
        }
        catch (error) {
            this.logger.error(`Error resolving number ${phone} on ${instanceName}: ${error.message}`);
            // If the Evolution API check fails (e.g. timeout), fallback to formatted to avoid blocking sends
            return this.formatPhone(phone);
        }
    }
    async getMaturityMetrics(instanceName) {
        try {
            // POST /chat/findChats/{instance} body {} to get ALL chats from cache/db
            const chats = await this.request('POST', `/chat/findChats/${instanceName}`, {});
            if (!Array.isArray(chats)) {
                return { chatCount: 0, groupCount: 0 };
            }
            const groupCount = chats.filter((c) => {
                const jid = c.remoteJid || c.id || '';
                return jid.endsWith('@g.us');
            }).length;
            const chatCount = chats.length - groupCount;
            this.logger.log(`Maturity Metrics for ${instanceName}: ${chatCount} private chats, ${groupCount} groups`);
            return { chatCount, groupCount };
        }
        catch (error) {
            this.logger.error(`Failed to scan maturity for ${instanceName}: ${error.message}`);
            return { chatCount: 0, groupCount: 0 };
        }
    }
    async joinGroup(instanceName, inviteUrl) {
        try {
            this.logger.log(`[Evolution] Joining group via invite: ${inviteUrl} for instance ${instanceName}`);
            // Fornecemos chaves alternativas para cobrir variações da API Evolution v1/v2
            return await this.request('POST', `/group/joinByInvite/${instanceName}`, {
                inviteUrl: inviteUrl,
                invite: inviteUrl,
            });
        }
        catch (error) {
            this.logger.error(`Failed to join group for ${instanceName}: ${error.message}`);
            throw error;
        }
    }
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
        const options = {
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
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Evolution API timeout after ${this.requestTimeout}ms`);
            }
            throw error;
        }
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
    mapStatus(evolutionState) {
        if (!evolutionState)
            return instance_status_enum_1.InstanceStatus.DISCONNECTED;
        const s = evolutionState.toLowerCase();
        if (s === 'open' || s === 'connected')
            return instance_status_enum_1.InstanceStatus.CONNECTED;
        if (s === 'connecting')
            return instance_status_enum_1.InstanceStatus.CONNECTING;
        if (s === 'reconnecting')
            return instance_status_enum_1.InstanceStatus.RECONNECTING;
        if (s === 'close')
            return instance_status_enum_1.InstanceStatus.DISCONNECTED;
        if (s === 'qrcode')
            return instance_status_enum_1.InstanceStatus.QR_PENDING;
        return instance_status_enum_1.InstanceStatus.DISCONNECTED;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async getContacts(instanceName) {
        try {
            const response = await this.request('POST', `/chat/findContacts/${instanceName}`, {});
            if (Array.isArray(response))
                return response;
            if (response && Array.isArray(response.contacts))
                return response.contacts;
            if (response && Array.isArray(response.data))
                return response.data;
            return [];
        }
        catch (error) {
            this.logger.error(`Failed to get Evolution contacts: ${error.message}`);
            return [];
        }
    }
    async getGroupParticipants(instanceName) {
        try {
            this.logger.log(`Fetching group participants for ${instanceName}`);
            // Usa fetchAllGroups com getParticipants=true
            const response = await this.request('GET', `/group/fetchAllGroups/${instanceName}?getParticipants=true`);
            const participants = [];
            let groupsArray = [];
            if (Array.isArray(response))
                groupsArray = response;
            else if (response && Array.isArray(response.data))
                groupsArray = response.data;
            else if (response && Array.isArray(response.groups))
                groupsArray = response.groups;
            for (const group of groupsArray) {
                const groupName = group.subject || group.name || 'Grupo Desconhecido';
                if (group.participants && Array.isArray(group.participants)) {
                    for (const member of group.participants) {
                        participants.push({
                            id: member.id || member.jid || member,
                            name: member.name || member.pushName || undefined,
                            groupName: groupName
                        });
                    }
                }
            }
            this.logger.log(`Found ${participants.length} group participants in ${instanceName}`);
            return participants;
        }
        catch (error) {
            this.logger.error(`Failed to get Evolution group participants: ${error.message}`);
            return [];
        }
    }
};
exports.EvolutionAdapter = EvolutionAdapter;
exports.EvolutionAdapter = EvolutionAdapter = EvolutionAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EvolutionAdapter);
