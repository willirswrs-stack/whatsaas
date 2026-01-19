import { Injectable, Logger } from '@nestjs/common';
import { OpenAIAdapter } from './openai.adapter';
import { AnthropicAdapter } from './anthropic.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { GroqAdapter } from './groq.adapter';
import { ILLMProvider, LLMProviderInfo, LLMProviderType } from './llm-provider.interface';

export interface TenantLLMKeys {
    openaiKey?: string | null;
    anthropicKey?: string | null;
    geminiKey?: string | null;
    groqKey?: string | null;
}

@Injectable()
export class LLMProviderFactory {
    private readonly logger = new Logger(LLMProviderFactory.name);

    private openaiAdapter: OpenAIAdapter;
    private anthropicAdapter: AnthropicAdapter;
    private geminiAdapter: GeminiAdapter;
    private groqAdapter: GroqAdapter;

    constructor() {
        this.openaiAdapter = new OpenAIAdapter();
        this.anthropicAdapter = new AnthropicAdapter();
        this.geminiAdapter = new GeminiAdapter();
        this.groqAdapter = new GroqAdapter();
    }

    /**
     * Configura todos os adapters com as API keys do tenant
     */
    configureForTenant(keys: TenantLLMKeys): void {
        if (keys.openaiKey) {
            this.openaiAdapter.configure(keys.openaiKey);
        }
        if (keys.anthropicKey) {
            this.anthropicAdapter.configure(keys.anthropicKey);
        }
        if (keys.geminiKey) {
            this.geminiAdapter.configure(keys.geminiKey);
        }
        if (keys.groqKey) {
            this.groqAdapter.configure(keys.groqKey);
        }
    }

    /**
     * Retorna o provider pelo tipo
     */
    getProvider(type: LLMProviderType): ILLMProvider {
        switch (type) {
            case 'openai':
                return this.openaiAdapter;
            case 'anthropic':
                return this.anthropicAdapter;
            case 'gemini':
                return this.geminiAdapter;
            case 'groq':
            case 'llama': // Llama é servido via Groq
                return this.groqAdapter;
            default:
                throw new Error(`Provider ${type} não suportado`);
        }
    }

    /**
     * Retorna lista de todos os providers disponíveis
     */
    getAllProviders(): ILLMProvider[] {
        return [
            this.openaiAdapter,
            this.anthropicAdapter,
            this.geminiAdapter,
            this.groqAdapter,
        ];
    }

    /**
     * Retorna informações de todos os providers para o frontend
     */
    getProvidersInfo(): LLMProviderInfo[] {
        return this.getAllProviders().map(provider => ({
            id: provider.id,
            name: provider.name,
            description: this.getProviderDescription(provider.id),
            models: provider.getAvailableModels(),
            isConfigured: provider.isConfigured(),
            icon: provider.icon,
            color: provider.color,
            docsUrl: provider.docsUrl,
        }));
    }

    /**
     * Retorna o primeiro provider configurado (fallback)
     */
    getDefaultProvider(): ILLMProvider | null {
        const providers = this.getAllProviders();
        return providers.find(p => p.isConfigured()) || null;
    }

    /**
     * Testa conexão de um provider específico
     */
    async testProvider(type: LLMProviderType): Promise<boolean> {
        try {
            const provider = this.getProvider(type);
            return await provider.testConnection();
        } catch (error) {
            this.logger.error(`Erro ao testar provider ${type}: ${error.message}`);
            return false;
        }
    }

    private getProviderDescription(id: string): string {
        const descriptions: Record<string, string> = {
            openai: 'GPT-4o, GPT-4 Turbo, o1 - Modelos mais populares',
            anthropic: 'Claude 3.5 Sonnet, Opus - Raciocínio avançado',
            gemini: 'Gemini Pro, Flash - Grande contexto (2M tokens)',
            groq: 'Llama, Mixtral, Gemma - API ultra-rápida',
        };
        return descriptions[id] || '';
    }
}
