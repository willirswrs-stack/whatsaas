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
var AnthropicAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicAdapter = void 0;
const common_1 = require("@nestjs/common");
let AnthropicAdapter = AnthropicAdapter_1 = class AnthropicAdapter {
    logger = new common_1.Logger(AnthropicAdapter_1.name);
    apiKey = null;
    id = 'anthropic';
    name = 'Anthropic';
    icon = '🧠';
    color = '#f97316';
    docsUrl = 'https://console.anthropic.com/settings/keys';
    constructor() { }
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
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Mais inteligente', contextWindow: 200000, maxOutput: 8192 },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Rápido e econômico', contextWindow: 200000, maxOutput: 8192 },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Máxima capacidade', contextWindow: 200000, maxOutput: 4096 },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanceado', contextWindow: 200000, maxOutput: 4096 },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Mais rápido', contextWindow: 200000, maxOutput: 4096 },
        ];
    }
    async generate(prompt, options = {}) {
        if (!this.apiKey) {
            throw new Error('Anthropic não configurado. Configure a API key nas configurações.');
        }
        const model = options.model || 'claude-3-5-sonnet-20241022';
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model,
                    max_tokens: options.maxTokens ?? 4096,
                    system: options.systemPrompt || undefined,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || 'Erro na API Anthropic');
            }
            const content = data.content?.[0]?.text || '';
            const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
            this.logger.log(`✅ Anthropic gerou resposta (${tokensUsed} tokens)`);
            return {
                content,
                tokensUsed,
                model,
                provider: this.id,
            };
        }
        catch (error) {
            this.logger.error(`Anthropic Error: ${error.message}`);
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
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Hi' }],
                }),
            });
            return response.ok;
        }
        catch (error) {
            this.logger.error(`Teste de conexão Anthropic falhou: ${error.message}`);
            return false;
        }
    }
    isConfigured() {
        return this.apiKey !== null;
    }
};
exports.AnthropicAdapter = AnthropicAdapter;
exports.AnthropicAdapter = AnthropicAdapter = AnthropicAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AnthropicAdapter);
