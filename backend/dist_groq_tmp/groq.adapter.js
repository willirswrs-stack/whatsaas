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
var GroqAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqAdapter = void 0;
const common_1 = require("@nestjs/common");
/**
 * Groq Adapter - API ultra-rápida para Llama, Mixtral e outros modelos
 */
let GroqAdapter = GroqAdapter_1 = class GroqAdapter {
    constructor() {
        this.logger = new common_1.Logger(GroqAdapter_1.name);
        this.apiKey = null;
        this.id = 'groq';
        this.name = 'Groq';
        this.icon = '⚡';
        this.color = '#06b6d4';
        this.docsUrl = 'https://console.groq.com/keys';
    }
    configure(apiKey) {
        if (apiKey && apiKey.length > 10 && !apiKey.includes('placeholder')) {
            this.apiKey = apiKey;
        }
        else {
            this.apiKey = null;
        }
    }
    getAvailableModels() {
        return [
            // Llama 3.3
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Mais recente e versátil', contextWindow: 128000, maxOutput: 32768 },
            // Llama 3.1
            { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', description: 'Alta capacidade', contextWindow: 128000, maxOutput: 32768 },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Rápido e leve', contextWindow: 128000, maxOutput: 8192 },
            // Llama 3
            { id: 'llama3-70b-8192', name: 'Llama 3 70B', description: 'Poderoso', contextWindow: 8192, maxOutput: 8192 },
            { id: 'llama3-8b-8192', name: 'Llama 3 8B', description: 'Eficiente', contextWindow: 8192, maxOutput: 8192 },
            // Mixtral
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Mixture of Experts', contextWindow: 32768, maxOutput: 32768 },
            // Gemma
            { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google Gemma', contextWindow: 8192, maxOutput: 8192 },
        ];
    }
    async generate(prompt, options = {}) {
        if (!this.apiKey) {
            throw new Error('Groq não configurado. Configure a API key nas configurações.');
        }
        const model = options.model || 'llama-3.3-70b-versatile';
        const doRequest = async (modelToUse) => {
            const messages = [];
            if (options.systemPrompt) {
                messages.push({ role: 'system', content: options.systemPrompt });
            }
            messages.push({ role: 'user', content: prompt });
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: modelToUse,
                    messages,
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.maxTokens ?? 4096,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                const err = new Error(data.error?.message || 'Erro na API Groq');
                err.statusCode = response.status;
                throw err;
            }
            const content = data.choices?.[0]?.message?.content || '';
            const tokensUsed = data.usage?.total_tokens || 0;
            this.logger.log(`✅ Groq gerou resposta com ${modelToUse} (${tokensUsed} tokens)`);
            return { content, tokensUsed, model: modelToUse, provider: this.id };
        };
        try {
            return await doRequest(model);
        }
        catch (error) {
            // Se for rate limit (429) e o modelo preferencial não for o leve, tenta fallback interno
            if (error.statusCode === 429 && model !== 'llama-3.1-8b-instant') {
                this.logger.warn(`Groq rate limit atingido no modelo '${model}'. Tentando fallback com 'llama-3.1-8b-instant'...`);
                try {
                    return await doRequest('llama-3.1-8b-instant');
                }
                catch (fallbackError) {
                    this.logger.error(`Groq fallback também falhou: ${fallbackError.message}`);
                    throw fallbackError;
                }
            }
            this.logger.error(`Groq Error: ${error.message}`);
            throw error;
        }
    }
    async generateVariations(text, count, options = {}) {
        const systemPrompt = `Você é um especialista em copywriting. Gere ${count} variações únicas do texto fornecido, mantendo o significado original mas variando a estrutura e palavras. Responda APENAS com um JSON no formato: {"variations": ["var1", "var2", ...]}`;
        const response = await this.generate(text, {
            ...options,
            systemPrompt,
            temperature: options.temperature ?? 0.8,
        });
        try {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.variations || [];
            }
            return [];
        }
        catch {
            this.logger.warn('Falha ao parsear variações, retornando array vazio');
            return [];
        }
    }
    async testConnection() {
        if (!this.apiKey)
            return false;
        try {
            const response = await fetch('https://api.groq.com/openai/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            });
            return response.ok;
        }
        catch (error) {
            this.logger.error(`Teste de conexão Groq falhou: ${error.message}`);
            return false;
        }
    }
    isConfigured() {
        return this.apiKey !== null;
    }
};
exports.GroqAdapter = GroqAdapter;
exports.GroqAdapter = GroqAdapter = GroqAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GroqAdapter);
