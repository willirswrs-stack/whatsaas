import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantSettings } from './entities/tenant-settings.entity';

export interface LLMApiKeys {
    openaiKey?: string;
    anthropicKey?: string;
    geminiKey?: string;
    groqKey?: string;
    elevenLabsKey?: string;
}

export interface GlobalConfig {
    // LLM Global
    globalLlmProvider?: string;
    globalLlmModel?: string;
    globalLlmTemperature?: number;
    globalLlmMaxTokens?: number;
    // Warmup Days (por perfil)
    warmupDaysColdOutbound?: number;
    warmupDaysWarmOutbound?: number;
    warmupDaysGroups?: number;
    warmupDaysInbound?: number;
    // Agent Prompts
    agentPromptMain?: string;
    agentPromptSpinner?: string;
    agentPromptAntiban?: string;
    // API Keys (global — super admin)
    openaiKey?: string;
    anthropicKey?: string;
    geminiKey?: string;
    groqKey?: string;
    elevenLabsKey?: string;
}

/** Tenant virtual usado para armazenar configurações globais da plataforma */
const SYSTEM_TENANT_ID = 'system';

/** Defaults para configurações globais */
const GLOBAL_DEFAULTS: GlobalConfig = {
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
};

@Injectable()
export class SettingsService {
    private readonly logger = new Logger(SettingsService.name);

    constructor(
        @InjectRepository(TenantSettings)
        private settingsRepo: Repository<TenantSettings>,
    ) { }

    async getSettings(tenantId: string): Promise<Partial<TenantSettings>> {
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
            extraSettings: settings.extraSettings,
        } as Partial<TenantSettings> & { elevenLabsKey?: string };
    }

    async updateSettings(tenantId: string, data: {
        openaiKey?: string;
        anthropicKey?: string;
        geminiKey?: string;
        groqKey?: string;
        elevenLabsKey?: string;
        extraSettings?: Record<string, any>;
    }): Promise<void> {
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

        // Tratar elevenLabsKey dentro de extraSettings
        if (data.elevenLabsKey !== undefined) {
            if (!settings.extraSettings) settings.extraSettings = {};
            if (!data.elevenLabsKey.includes('*')) {
                settings.extraSettings.elevenLabsKey = data.elevenLabsKey;
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
    async getGlobalSettings(): Promise<GlobalConfig> {
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
        };
    }

    /**
     * Atualiza configurações globais da plataforma (super admin only).
     */
    async updateGlobalSettings(data: GlobalConfig): Promise<void> {
        let systemSettings = await this.settingsRepo.findOne({ where: { tenantId: SYSTEM_TENANT_ID } });

        if (!systemSettings) {
            systemSettings = this.settingsRepo.create({ tenantId: SYSTEM_TENANT_ID });
        }

        const existing = systemSettings.globalConfig || {};

        // Atualizar campos de configuração (não-keys)
        const updated: Record<string, any> = {
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
        if (data.openaiKey && !data.openaiKey.includes('*')) updated.openaiKey = data.openaiKey;
        if (data.anthropicKey && !data.anthropicKey.includes('*')) updated.anthropicKey = data.anthropicKey;
        if (data.geminiKey && !data.geminiKey.includes('*')) updated.geminiKey = data.geminiKey;
        if (data.groqKey && !data.groqKey.includes('*')) updated.groqKey = data.groqKey;
        if (data.elevenLabsKey && !data.elevenLabsKey.includes('*')) updated.elevenLabsKey = data.elevenLabsKey;

        systemSettings.globalConfig = updated;
        await this.settingsRepo.save(systemSettings);
        this.logger.log('Global settings updated by super admin');
    }

    /**
     * Retorna as chaves de API globais para uso interno (sem mascaramento).
     * Fallback para keys do tenant caso a global não exista.
     */
    async getEffectiveLLMKeys(tenantId: string): Promise<LLMApiKeys> {
        // 1. Tentar chaves globais do sistema (definidas pelo super admin)
        const systemSettings = await this.settingsRepo.findOne({ where: { tenantId: SYSTEM_TENANT_ID } });
        const globalConfig = systemSettings?.globalConfig || {};

        if (globalConfig.openaiKey || globalConfig.anthropicKey || globalConfig.geminiKey || globalConfig.groqKey) {
            return {
                openaiKey: globalConfig.openaiKey || undefined,
                anthropicKey: globalConfig.anthropicKey || undefined,
                geminiKey: globalConfig.geminiKey || undefined,
                groqKey: globalConfig.groqKey || undefined,
                elevenLabsKey: globalConfig.elevenLabsKey || undefined,
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
        };
    }

    // Métodos legados (compatibilidade com código existente)
    async getOpenAIKey(tenantId: string): Promise<string | null> {
        const keys = await this.getEffectiveLLMKeys(tenantId);
        return keys.openaiKey || null;
    }

    async getAnthropicKey(tenantId: string): Promise<string | null> {
        const keys = await this.getEffectiveLLMKeys(tenantId);
        return keys.anthropicKey || null;
    }

    async getGeminiKey(tenantId: string): Promise<string | null> {
        const keys = await this.getEffectiveLLMKeys(tenantId);
        return keys.geminiKey || null;
    }

    async getGroqKey(tenantId: string): Promise<string | null> {
        const keys = await this.getEffectiveLLMKeys(tenantId);
        return keys.groqKey || null;
    }

    /**
     * @deprecated Use getEffectiveLLMKeys() que considera chaves globais primeiro.
     */
    async getAllLLMKeys(tenantId: string): Promise<LLMApiKeys> {
        return this.getEffectiveLLMKeys(tenantId);
    }

    private maskKey(key: string): string {
        if (!key || key.length < 8) return '';
        return key.substring(0, 7) + '****' + key.substring(key.length - 4);
    }
}
