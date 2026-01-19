import { Injectable, Logger } from '@nestjs/common';
import {
    ILLMProvider,
    LLMOptions,
    LLMResponse,
    LLMModelInfo,
} from './llm-provider.interface';

@Injectable()
export class GeminiAdapter implements ILLMProvider {
    private readonly logger = new Logger(GeminiAdapter.name);
    private apiKey: string | null = null;

    readonly id = 'gemini';
    readonly name = 'Google Gemini';
    readonly icon = '💎';
    readonly color = '#3b82f6';
    readonly docsUrl = 'https://aistudio.google.com/app/apikey';

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
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Mais recente e rápido', contextWindow: 1048576, maxOutput: 8192 },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Alta capacidade', contextWindow: 2097152, maxOutput: 8192 },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido e eficiente', contextWindow: 1048576, maxOutput: 8192 },
            { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', description: 'Ultra econômico', contextWindow: 1048576, maxOutput: 8192 },
        ];
    }

    async generate(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
        if (!this.apiKey) {
            throw new Error('Google Gemini não configurado. Configure a API key nas configurações.');
        }

        const model = options.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        try {
            const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

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
        } catch (error) {
            this.logger.error(`Gemini Error: ${error.message}`);
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
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
            const response = await fetch(url);
            return response.ok;
        } catch (error) {
            this.logger.error(`Teste de conexão Gemini falhou: ${error.message}`);
            return false;
        }
    }

    isConfigured(): boolean {
        return this.apiKey !== null;
    }
}
