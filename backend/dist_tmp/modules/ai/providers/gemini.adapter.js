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
var GeminiAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAdapter = void 0;
const common_1 = require("@nestjs/common");
let GeminiAdapter = GeminiAdapter_1 = class GeminiAdapter {
    logger = new common_1.Logger(GeminiAdapter_1.name);
    apiKey = null;
    id = 'gemini';
    name = 'Google Gemini';
    icon = '💎';
    color = '#3b82f6';
    docsUrl = 'https://aistudio.google.com/app/apikey';
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
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Mais recente e rápido', contextWindow: 1048576, maxOutput: 8192 },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Alta capacidade', contextWindow: 2097152, maxOutput: 8192 },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido e eficiente', contextWindow: 1048576, maxOutput: 8192 },
            { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', description: 'Ultra econômico', contextWindow: 1048576, maxOutput: 8192 },
        ];
    }
    async generate(prompt, options = {}) {
        if (!this.apiKey) {
            throw new Error('Google Gemini não configurado. Configure a API key nas configurações.');
        }
        const model = options.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        try {
            const contents = [];
            if (options.systemPrompt) {
                contents.push({
                    role: 'user',
                    parts: [{ text: `[Sistema]: ${options.systemPrompt}` }]
                });
                contents.push({
                    role: 'model',
                    parts: [{ text: 'Entendido, vou seguir essas instruções.' }]
                });
            }
            contents.push({
                role: 'user',
                parts: [{ text: prompt }]
            });
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: options.temperature ?? 0.7,
                        maxOutputTokens: options.maxTokens ?? 4096,
                    },
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || 'Erro na API Gemini');
            }
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const tokensUsed = (data.usageMetadata?.promptTokenCount || 0) +
                (data.usageMetadata?.candidatesTokenCount || 0);
            this.logger.log(`✅ Gemini gerou resposta (${tokensUsed} tokens)`);
            return {
                content,
                tokensUsed,
                model,
                provider: this.id,
            };
        }
        catch (error) {
            this.logger.error(`Gemini Error: ${error.message}`);
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
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
            const response = await fetch(url);
            return response.ok;
        }
        catch (error) {
            this.logger.error(`Teste de conexão Gemini falhou: ${error.message}`);
            return false;
        }
    }
    isConfigured() {
        return this.apiKey !== null;
    }
};
exports.GeminiAdapter = GeminiAdapter;
exports.GeminiAdapter = GeminiAdapter = GeminiAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GeminiAdapter);
