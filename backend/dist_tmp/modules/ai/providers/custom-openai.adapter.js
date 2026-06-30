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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CustomOpenAIAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomOpenAIAdapter = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
let CustomOpenAIAdapter = CustomOpenAIAdapter_1 = class CustomOpenAIAdapter {
    logger = new common_1.Logger(CustomOpenAIAdapter_1.name);
    client = null;
    apiKey = null;
    baseUrl = null;
    id = 'custom';
    name = 'Custom (OpenAI Compatible)';
    icon = '🔌';
    color = '#8b5cf6';
    docsUrl = '';
    constructor() { }
    /**
     * Configura o adapter com a API key e baseURL
     */
    configure(apiKey, baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl || null;
        if (apiKey && apiKey.length > 5 && !apiKey.includes('placeholder') && baseUrl && baseUrl.startsWith('http')) {
            try {
                this.client = new openai_1.default({
                    apiKey,
                    baseURL: baseUrl
                });
            }
            catch (e) {
                this.logger.error(`Erro ao instanciar Custom OpenAI: ${e.message}`);
                this.client = null;
            }
        }
        else {
            this.client = null;
        }
    }
    getAvailableModels() {
        // Modelos são populados via fetch dinâmico no frontend/controller
        // Retornamos um modelo genérico padrão por segurança
        return [
            { id: 'default', name: 'Default Model', description: 'Modelo padrão do provedor', contextWindow: 4096, maxOutput: 4096 }
        ];
    }
    async generate(prompt, options = {}) {
        if (!this.client) {
            throw new Error('Provedor Customizado não configurado ou URL inválida.');
        }
        const model = options.model || 'default';
        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });
        try {
            const response = await this.client.chat.completions.create({
                model,
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 4096,
            });
            const content = response.choices[0]?.message?.content || '';
            this.logger.log(`✅ Custom Provider gerou resposta (${response.usage?.total_tokens || 0} tokens)`);
            return {
                content,
                tokensUsed: response.usage?.total_tokens || 0,
                model,
                provider: this.id,
            };
        }
        catch (error) {
            this.logger.error(`Custom Provider Error: ${error.message}`);
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
            // Tenta remover crases de markdown se o modelo tiver retornado com formatação
            let content = response.content.trim();
            if (content.startsWith('```json'))
                content = content.substring(7);
            if (content.startsWith('```'))
                content = content.substring(3);
            if (content.endsWith('```'))
                content = content.substring(0, content.length - 3);
            const parsed = JSON.parse(content.trim());
            return parsed.variations || [];
        }
        catch {
            this.logger.warn('Falha ao parsear variações no Custom Provider, retornando array vazio');
            return [];
        }
    }
    async testConnection() {
        if (!this.client)
            return false;
        try {
            await this.client.models.list();
            return true;
        }
        catch (error) {
            this.logger.error(`Teste de conexão Custom Provider falhou: ${error.message}`);
            return false;
        }
    }
    isConfigured() {
        return this.client !== null;
    }
};
exports.CustomOpenAIAdapter = CustomOpenAIAdapter;
exports.CustomOpenAIAdapter = CustomOpenAIAdapter = CustomOpenAIAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CustomOpenAIAdapter);
