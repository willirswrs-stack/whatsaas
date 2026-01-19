import { Injectable, Logger } from '@nestjs/common';
import {
    ILLMProvider,
    LLMOptions,
    LLMResponse,
    LLMModelInfo,
} from './llm-provider.interface';

/**
 * Groq Adapter - API ultra-rápida para Llama, Mixtral e outros modelos
 */
@Injectable()
export class GroqAdapter implements ILLMProvider {
    private readonly logger = new Logger(GroqAdapter.name);
    private apiKey: string | null = null;

    readonly id = 'groq';
    readonly name = 'Groq';
    readonly icon = '⚡';
    readonly color = '#06b6d4';
    readonly docsUrl = 'https://console.groq.com/keys';

    constructor() { }

    configure(apiKey: string): void {
        if (apiKey && apiKey.length > 10 && !apiKey.includes('placeholder')) {
            this.apiKey = apiKey;
        } else {
            this.apiKey = null;
        }
    }

    getAvailableModels(): LLMModelInfo[] {
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

    async generate(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
        if (!this.apiKey) {
            throw new Error('Groq não configurado. Configure a API key nas configurações.');
        }

        const model = options.model || 'llama-3.3-70b-versatile';

        try {
            const messages: Array<{ role: string; content: string }> = [];

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
                    model,
                    messages,
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.maxTokens ?? 4096,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Erro na API Groq');
            }

            const content = data.choices?.[0]?.message?.content || '';
            const tokensUsed = data.usage?.total_tokens || 0;

            this.logger.log(`✅ Groq gerou resposta (${tokensUsed} tokens)`);

            return {
                content,
                tokensUsed,
                model,
                provider: this.id,
            };
        } catch (error) {
            this.logger.error(`Groq Error: ${error.message}`);
            throw error;
        }
    }

    async generateVariations(text: string, count: number, options: LLMOptions = {}): Promise<string[]> {
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
        } catch {
            this.logger.warn('Falha ao parsear variações, retornando array vazio');
            return [];
        }
    }

    async testConnection(): Promise<boolean> {
        if (!this.apiKey) return false;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            });
            return response.ok;
        } catch (error) {
            this.logger.error(`Teste de conexão Groq falhou: ${error.message}`);
            return false;
        }
    }

    isConfigured(): boolean {
        return this.apiKey !== null;
    }
}
