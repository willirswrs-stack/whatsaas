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
var LLMProviderFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMProviderFactory = void 0;
const common_1 = require("@nestjs/common");
const openai_adapter_1 = require("./openai.adapter");
const anthropic_adapter_1 = require("./anthropic.adapter");
const gemini_adapter_1 = require("./gemini.adapter");
const groq_adapter_1 = require("./groq.adapter");
const custom_openai_adapter_1 = require("./custom-openai.adapter");
let LLMProviderFactory = LLMProviderFactory_1 = class LLMProviderFactory {
    logger = new common_1.Logger(LLMProviderFactory_1.name);
    openaiAdapter;
    anthropicAdapter;
    geminiAdapter;
    groqAdapter;
    customAdapter;
    constructor() {
        this.openaiAdapter = new openai_adapter_1.OpenAIAdapter();
        this.anthropicAdapter = new anthropic_adapter_1.AnthropicAdapter();
        this.geminiAdapter = new gemini_adapter_1.GeminiAdapter();
        this.groqAdapter = new groq_adapter_1.GroqAdapter();
        this.customAdapter = new custom_openai_adapter_1.CustomOpenAIAdapter();
    }
    /**
     * Configura todos os adapters com as API keys do tenant
     */
    configureForTenant(keys) {
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
        if (keys.customLlmKey && keys.customLlmUrl) {
            this.customAdapter.configure(keys.customLlmKey, keys.customLlmUrl);
        }
    }
    /**
     * Retorna o provider pelo tipo
     */
    getProvider(type) {
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
            case 'custom':
                return this.customAdapter;
            default:
                throw new Error(`Provider ${type} não suportado`);
        }
    }
    /**
     * Orquestra a geração de texto utilizando fallbacks em cascata em caso de falha.
     */
    async generateWithFallback(preferredType, prompt, options) {
        let preferredProvider = null;
        try {
            preferredProvider = this.getProvider(preferredType);
        }
        catch (e) {
            // Ignora erro se o provider não existir
        }
        if (preferredProvider && preferredProvider.isConfigured()) {
            try {
                return await preferredProvider.generate(prompt, options);
            }
            catch (error) {
                this.logger.warn(`Provider preferencial '${preferredType}' falhou (${error.message}). Iniciando fallbacks em cascata...`);
            }
        }
        else {
            this.logger.warn(`Provider preferencial '${preferredType}' não está configurado. Iniciando fallbacks em cascata...`);
        }
        // Tentar fallbacks na ordem de segurança/estabilidade (Efeito Dominó dinâmico)
        const allProviders = this.getAllProviders();
        for (const fallbackProvider of allProviders) {
            if (fallbackProvider.id === preferredType)
                continue; // Já tentou ou pulou
            if (fallbackProvider.isConfigured()) {
                try {
                    this.logger.log(`Tentando fallback com o provedor: ${fallbackProvider.id}...`);
                    // Removemos a opção 'model' porque os provedores têm nomes de modelo diferentes
                    // e deixar o model do preferencial faria o fallback quebrar.
                    const fallbackOptions = { ...options };
                    delete fallbackOptions.model;
                    return await fallbackProvider.generate(prompt, fallbackOptions);
                }
                catch (fallbackError) {
                    this.logger.warn(`Fallback '${fallbackProvider.id}' falhou: ${fallbackError.message}`);
                }
            }
        }
        throw new Error('Todos os provedores de LLM falharam ou não estão configurados adequadamente.');
    }
    /**
     * Retorna lista de todos os providers disponíveis
     */
    getAllProviders() {
        return [
            this.openaiAdapter,
            this.anthropicAdapter,
            this.geminiAdapter,
            this.groqAdapter,
            this.customAdapter,
        ];
    }
    /**
     * Retorna informações de todos os providers para o frontend
     */
    getProvidersInfo() {
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
    getDefaultProvider() {
        const providers = this.getAllProviders();
        return providers.find(p => p.isConfigured()) || null;
    }
    /**
     * Testa conexão de um provider específico
     */
    async testProvider(type) {
        try {
            const provider = this.getProvider(type);
            return await provider.testConnection();
        }
        catch (error) {
            this.logger.error(`Erro ao testar provider ${type}: ${error.message}`);
            return false;
        }
    }
    getProviderDescription(id) {
        const descriptions = {
            openai: 'GPT-4o, GPT-4 Turbo, o1 - Modelos mais populares',
            anthropic: 'Claude 3.5 Sonnet, Opus - Raciocínio avançado',
            gemini: 'Gemini Pro, Flash - Grande contexto (2M tokens)',
            groq: 'Llama, Mixtral, Gemma - API ultra-rápida',
            custom: 'URL customizada (OpenAI Compatible)',
        };
        return descriptions[id] || '';
    }
};
exports.LLMProviderFactory = LLMProviderFactory;
exports.LLMProviderFactory = LLMProviderFactory = LLMProviderFactory_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], LLMProviderFactory);
