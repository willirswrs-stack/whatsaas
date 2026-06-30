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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SettingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_settings_entity_1 = require("./entities/tenant-settings.entity");
/** Tenant virtual usado para armazenar configurações globais da plataforma */
const SYSTEM_TENANT_ID = 'system';
/** Defaults para configurações globais */
const GLOBAL_DEFAULTS = {
    globalLlmProvider: 'openai',
    globalLlmModel: 'gpt-4o-mini',
    globalLlmTemperature: 0.7,
    globalLlmMaxTokens: 2048,
    warmupDaysColdOutbound: 60,
    warmupDaysWarmOutbound: 30,
    warmupDaysGroups: 30,
    warmupDaysInbound: 14,
    agentPromptMain: 'Você é um assistente especialista em Marketing Digital e automação via WhatsApp. Ajude o usuário a configurar campanhas, criar fluxos e evitar banimentos.',
    agentPromptSpinner: 'Reescreva o texto fornecido de {count} formas diferentes, mantendo o significado original mas variando vocabulário e estrutura. Retorne apenas as variações, separadas por "---".',
    agentPromptAntiban: 'Você analisa mensagens de WhatsApp e reescreve de forma mais natural e humana, evitando padrões que podem ser detectados como spam. Mantenha o tom e a intenção original.',
    customLlmKey: '',
    customLlmUrl: '',
};
let SettingsService = SettingsService_1 = class SettingsService {
    settingsRepo;
    logger = new common_1.Logger(SettingsService_1.name);
    constructor(settingsRepo) {
        this.settingsRepo = settingsRepo;
    }
    async getSettings(tenantId) {
        let settings = await this.settingsRepo.findOne({ where: { tenantId } });
        if (!settings) {
            settings = this.settingsRepo.create({ tenantId });
            await this.settingsRepo.save(settings);
        }
        // Retornar keys mascaradas para segurança
        return {
            openaiKey: settings.openaiKey ? this.maskKey(settings.openaiKey) : '',
            anthropicKey: settings.anthropicKey ? this.maskKey(settings.anthropicKey) : '',
            geminiKey: settings.geminiKey ? this.maskKey(settings.geminiKey) : '',
            groqKey: settings.groqKey ? this.maskKey(settings.groqKey) : '',
            elevenLabsKey: settings.extraSettings?.elevenLabsKey ? this.maskKey(settings.extraSettings.elevenLabsKey) : '',
            customLlmKey: settings.extraSettings?.customLlmKey ? this.maskKey(settings.extraSettings.customLlmKey) : '',
            customLlmUrl: settings.extraSettings?.customLlmUrl || '',
            extraSettings: settings.extraSettings,
        };
    }
    async updateSettings(tenantId, data) {
        let settings = await this.settingsRepo.findOne({ where: { tenantId } });
        if (!settings) {
            settings = this.settingsRepo.create({ tenantId });
        }
        // Só atualiza se valor não for mascarado (contém *)
        if (data.openaiKey && !data.openaiKey.includes('*')) {
            settings.openaiKey = data.openaiKey;
        }
        if (data.anthropicKey && !data.anthropicKey.includes('*')) {
            settings.anthropicKey = data.anthropicKey;
        }
        if (data.geminiKey && !data.geminiKey.includes('*')) {
            settings.geminiKey = data.geminiKey;
        }
        if (data.groqKey && !data.groqKey.includes('*')) {
            settings.groqKey = data.groqKey;
        }
        // Tratar elevenLabsKey e customLLM dentro de extraSettings
        if (data.elevenLabsKey !== undefined || data.customLlmKey !== undefined || data.customLlmUrl !== undefined) {
            if (!settings.extraSettings)
                settings.extraSettings = {};
            if (data.elevenLabsKey !== undefined && !data.elevenLabsKey.includes('*')) {
                settings.extraSettings.elevenLabsKey = data.elevenLabsKey;
            }
            if (data.customLlmKey !== undefined && !data.customLlmKey.includes('*')) {
                settings.extraSettings.customLlmKey = data.customLlmKey;
            }
            if (data.customLlmUrl !== undefined) {
                settings.extraSettings.customLlmUrl = data.customLlmUrl;
            }
        }
        if (data.extraSettings) {
            settings.extraSettings = { ...settings.extraSettings, ...data.extraSettings };
        }
        await this.settingsRepo.save(settings);
        this.logger.log(`Settings updated for tenant ${tenantId}`);
    }
    // ─── CONFIGURAÇÕES GLOBAIS (Super Admin Only) ─────────────────
    /**
     * Retorna configurações globais da plataforma.
     * Lê do tenant virtual "system". Mescla com defaults.
     */
    async getGlobalSettings() {
        let systemSettings = await this.settingsRepo.findOne({ where: { tenantId: SYSTEM_TENANT_ID } });
        if (!systemSettings) {
            systemSettings = this.settingsRepo.create({ tenantId: SYSTEM_TENANT_ID, globalConfig: {} });
            await this.settingsRepo.save(systemSettings);
        }
        const config = systemSettings.globalConfig || {};
        return {
            ...GLOBAL_DEFAULTS,
            ...config,
            // Mascarar chaves de API globais
            openaiKey: config.openaiKey ? this.maskKey(config.openaiKey) : '',
            anthropicKey: config.anthropicKey ? this.maskKey(config.anthropicKey) : '',
            geminiKey: config.geminiKey ? this.maskKey(config.geminiKey) : '',
            groqKey: config.groqKey ? this.maskKey(config.groqKey) : '',
            elevenLabsKey: config.elevenLabsKey ? this.maskKey(config.elevenLabsKey) : '',
            customLlmKey: config.customLlmKey ? this.maskKey(config.customLlmKey) : '',
            customLlmUrl: config.customLlmUrl || '',
        };
    }
    /**
     * Atualiza configurações globais da plataforma (super admin only).
     */
    async updateGlobalSettings(data) {
        let systemSettings = await this.settingsRepo.findOne({ where: { tenantId: SYSTEM_TENANT_ID } });
        if (!systemSettings) {
            systemSettings = this.settingsRepo.create({ tenantId: SYSTEM_TENANT_ID });
        }
        const existing = systemSettings.globalConfig || {};
        // Atualizar campos de configuração (não-keys)
        const updated = {
            ...existing,
            globalLlmProvider: data.globalLlmProvider ?? existing.globalLlmProvider,
            globalLlmModel: data.globalLlmModel ?? existing.globalLlmModel,
            globalLlmTemperature: data.globalLlmTemperature ?? existing.globalLlmTemperature,
            globalLlmMaxTokens: data.globalLlmMaxTokens ?? existing.globalLlmMaxTokens,
            warmupDaysColdOutbound: data.warmupDaysColdOutbound ?? existing.warmupDaysColdOutbound,
            warmupDaysWarmOutbound: data.warmupDaysWarmOutbound ?? existing.warmupDaysWarmOutbound,
            warmupDaysGroups: data.warmupDaysGroups ?? existing.warmupDaysGroups,
            warmupDaysInbound: data.warmupDaysInbound ?? existing.warmupDaysInbound,
            agentPromptMain: data.agentPromptMain ?? existing.agentPromptMain,
            agentPromptSpinner: data.agentPromptSpinner ?? existing.agentPromptSpinner,
            agentPromptAntiban: data.agentPromptAntiban ?? existing.agentPromptAntiban,
        };
        // Atualizar chaves de API apenas se não mascaradas
        if (data.openaiKey && !data.openaiKey.includes('*'))
            updated.openaiKey = data.openaiKey;
        if (data.anthropicKey && !data.anthropicKey.includes('*'))
            updated.anthropicKey = data.anthropicKey;
        if (data.geminiKey && !data.geminiKey.includes('*'))
            updated.geminiKey = data.geminiKey;
        if (data.groqKey && !data.groqKey.includes('*'))
            updated.groqKey = data.groqKey;
        if (data.elevenLabsKey && !data.elevenLabsKey.includes('*'))
            updated.elevenLabsKey = data.elevenLabsKey;
        if (data.customLlmKey && !data.customLlmKey.includes('*'))
            updated.customLlmKey = data.customLlmKey;
        if (data.customLlmUrl !== undefined)
            updated.customLlmUrl = data.customLlmUrl;
        systemSettings.globalConfig = updated;
        await this.settingsRepo.save(systemSettings);
        this.logger.log('Global settings updated by super admin');
    }
    /**
     * Retorna as chaves de API globais para uso interno (sem mascaramento).
     * Fallback para keys do tenant caso a global não exista.
     */
    async getEffectiveLLMKeys(tenantId) {
        // 1. Tentar chaves globais do sistema (definidas pelo super admin)
        const systemSettings = await this.settingsRepo.findOne({ where: { tenantId: SYSTEM_TENANT_ID } });
        const globalConfig = systemSettings?.globalConfig || {};
        if (globalConfig.openaiKey || globalConfig.anthropicKey || globalConfig.geminiKey || globalConfig.groqKey || globalConfig.customLlmKey) {
            return {
                openaiKey: globalConfig.openaiKey || undefined,
                anthropicKey: globalConfig.anthropicKey || undefined,
                geminiKey: globalConfig.geminiKey || undefined,
                groqKey: globalConfig.groqKey || undefined,
                elevenLabsKey: globalConfig.elevenLabsKey || undefined,
                customLlmKey: globalConfig.customLlmKey || undefined,
                customLlmUrl: globalConfig.customLlmUrl || undefined,
            };
        }
        // 2. Fallback: chaves do próprio tenant
        const settings = await this.settingsRepo.findOne({ where: { tenantId } });
        return {
            openaiKey: settings?.openaiKey || undefined,
            anthropicKey: settings?.anthropicKey || undefined,
            geminiKey: settings?.geminiKey || undefined,
            groqKey: settings?.groqKey || undefined,
            elevenLabsKey: settings?.extraSettings?.elevenLabsKey || undefined,
            customLlmKey: settings?.extraSettings?.customLlmKey || undefined,
            customLlmUrl: settings?.extraSettings?.customLlmUrl || undefined,
        };
    }
    // Métodos legados (compatibilidade com código existente)
    async getOpenAIKey(tenantId) {
        const keys = await this.getEffectiveLLMKeys(tenantId);
        return keys.openaiKey || null;
    }
    async getAnthropicKey(tenantId) {
        const keys = await this.getEffectiveLLMKeys(tenantId);
        return keys.anthropicKey || null;
    }
    async getGeminiKey(tenantId) {
        const keys = await this.getEffectiveLLMKeys(tenantId);
        return keys.geminiKey || null;
    }
    async getGroqKey(tenantId) {
        const keys = await this.getEffectiveLLMKeys(tenantId);
        return keys.groqKey || null;
    }
    /**
     * @deprecated Use getEffectiveLLMKeys() que considera chaves globais primeiro.
     */
    async getAllLLMKeys(tenantId) {
        return this.getEffectiveLLMKeys(tenantId);
    }
    maskKey(key) {
        if (!key || key.length < 8)
            return '';
        return key.substring(0, 7) + '****' + key.substring(key.length - 4);
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = SettingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tenant_settings_entity_1.TenantSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SettingsService);
