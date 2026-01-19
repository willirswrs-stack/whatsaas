import { Injectable, Logger } from '@nestjs/common';
import {
    ILLMProvider,
    LLMOptions,
    LLMResponse,
    LLMModelInfo,
} from './llm-provider.interface';

@Injectable()
export class AnthropicAdapter implements ILLMProvider {
    private readonly logger = new Logger(AnthropicAdapter.name);
    private apiKey: string | null = null;

    readonly id = 'anthropic';
    readonly name = 'Anthropic';
    readonly icon = '🧠';
    readonly color = '#f97316';
    readonly docsUrl = 'https://console.anthropic.com/settings/keys';

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
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Mais inteligente', contextWindow: 200000, maxOutput: 8192 },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Rápido e econômico', contextWindow: 200000, maxOutput: 8192 },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Máxima capacidade', contextWindow: 200000, maxOutput: 4096 },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanceado', contextWindow: 200000, maxOutput: 4096 },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Mais rápido', contextWindow: 200000, maxOutput: 4096 },
        ];
    }

    async generate(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
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
        } catch (error) {
            this.logger.error(`Anthropic Error: ${error.message}`);
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
        } catch (error) {
            this.logger.error(`Teste de conexão Anthropic falhou: ${error.message}`);
            return false;
        }
    }

    isConfigured(): boolean {
        return this.apiKey !== null;
    }
}
