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

    // Métodos para uso interno - retornam keys reais
    async getOpenAIKey(tenantId: string): Promise<string | null> {
        const settings = await this.settingsRepo.findOne({ where: { tenantId } });
        return settings?.openaiKey || null;
    }

    async getAnthropicKey(tenantId: string): Promise<string | null> {
        const settings = await this.settingsRepo.findOne({ where: { tenantId } });
        return settings?.anthropicKey || null;
    }

    async getGeminiKey(tenantId: string): Promise<string | null> {
        const settings = await this.settingsRepo.findOne({ where: { tenantId } });
        return settings?.geminiKey || null;
    }

    async getGroqKey(tenantId: string): Promise<string | null> {
        const settings = await this.settingsRepo.findOne({ where: { tenantId } });
        return settings?.groqKey || null;
    }

    /**
     * Retorna todas as API keys para configurar os providers
     */
    async getAllLLMKeys(tenantId: string): Promise<LLMApiKeys> {
        const settings = await this.settingsRepo.findOne({ where: { tenantId } });
        return {
            openaiKey: settings?.openaiKey || undefined,
            anthropicKey: settings?.anthropicKey || undefined,
            geminiKey: settings?.geminiKey || undefined,
            groqKey: settings?.groqKey || undefined,
            elevenLabsKey: settings?.extraSettings?.elevenLabsKey || undefined,
        };
    }

    private maskKey(key: string): string {
        if (!key || key.length < 8) return '';
        return key.substring(0, 7) + '****' + key.substring(key.length - 4);
    }
}

