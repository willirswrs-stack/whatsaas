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
var OpenAIAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIAdapter = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
let OpenAIAdapter = OpenAIAdapter_1 = class OpenAIAdapter {
    logger = new common_1.Logger(OpenAIAdapter_1.name);
    client = null;
    apiKey = null;
    id = 'openai';
    name = 'OpenAI';
    icon = '✨';
    color = '#10b981';
    docsUrl = 'https://platform.openai.com/api-keys';
    constructor() { }
    /**
     * Configura o adapter com a API key
     */
    configure(apiKey) {
        this.apiKey = apiKey;
        if (apiKey && apiKey.length > 10 && !apiKey.includes('placeholder')) {
            this.client = new openai_1.default({ apiKey });
        }
        else {
            this.client = null;
        }
    }
    getAvailableModels() {
        return [
            { id: 'gpt-4o', name: 'GPT-4o', description: 'Mais rápido e eficiente', contextWindow: 128000, maxOutput: 16384 },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Econômico e rápido', contextWindow: 128000, maxOutput: 16384 },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Alta performance', contextWindow: 128000, maxOutput: 4096 },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Mais econômico', contextWindow: 16385, maxOutput: 4096 },
            { id: 'o1-preview', name: 'o1 Preview', description: 'Raciocínio avançado', contextWindow: 128000, maxOutput: 32768 },
            { id: 'o1-mini', name: 'o1 Mini', description: 'Raciocínio eficiente', contextWindow: 128000, maxOutput: 65536 },
        ];
    }
    async generate(prompt, options = {}) {
        if (!this.client) {
            throw new Error('OpenAI não configurado. Configure a API key nas configurações.');
        }
        const model = options.model || 'gpt-4o';
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
            this.logger.log(`✅ OpenAI gerou resposta (${response.usage?.total_tokens || 0} tokens)`);
            return {
                content,
                tokensUsed: response.usage?.total_tokens || 0,
                model,
                provider: this.id,
            };
        }
        catch (error) {
            this.logger.error(`OpenAI Error: ${error.message}`);
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
            const parsed = JSON.parse(response.content);
            return parsed.variations || [];
        }
        catch {
            this.logger.warn('Falha ao parsear variações, retornando array vazio');
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
            this.logger.error(`Teste de conexão OpenAI falhou: ${error.message}`);
            return false;
        }
    }
    isConfigured() {
        return this.client !== null;
    }
};
exports.OpenAIAdapter = OpenAIAdapter;
exports.OpenAIAdapter = OpenAIAdapter = OpenAIAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], OpenAIAdapter);
