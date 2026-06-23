"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqAdapter = void 0;
const common_1 = require("@nestjs/common");
/**
 * Groq Adapter - API ultra-rápida para Llama, Mixtral e outros modelos
 */
let GroqAdapter = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var GroqAdapter = _classThis = class {
        constructor() {
            this.logger = new common_1.Logger(GroqAdapter.name);
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
    __setFunctionName(_classThis, "GroqAdapter");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GroqAdapter = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GroqAdapter = _classThis;
})();
exports.GroqAdapter = GroqAdapter;
