import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
    ILLMProvider,
    LLMOptions,
    LLMResponse,
    LLMModelInfo,
} from './llm-provider.interface';

@Injectable()
export class OpenAIAdapter implements ILLMProvider {
    private readonly logger = new Logger(OpenAIAdapter.name);
    private client: OpenAI | null = null;
    private apiKey: string | null = null;

    readonly id = 'openai';
    readonly name = 'OpenAI';
    readonly icon = '✨';
    readonly color = '#10b981';
    readonly docsUrl = 'https://platform.openai.com/api-keys';

    constructor() { }

    /**
     * Configura o adapter com a API key
     */
    configure(apiKey: string): void {
        this.apiKey = apiKey;
        if (apiKey && apiKey.length > 10 && !apiKey.includes('placeholder')) {
            this.client = new OpenAI({ apiKey });
        } else {
            this.client = null;
        }
    }

    getAvailableModels(): LLMModelInfo[] {
        return [
            { id: 'gpt-4o', name: 'GPT-4o', description: 'Mais rápido e eficiente', contextWindow: 128000, maxOutput: 16384 },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Econômico e rápido', contextWindow: 128000, maxOutput: 16384 },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Alta performance', contextWindow: 128000, maxOutput: 4096 },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Mais econômico', contextWindow: 16385, maxOutput: 4096 },
            { id: 'o1-preview', name: 'o1 Preview', description: 'Raciocínio avançado', contextWindow: 128000, maxOutput: 32768 },
            { id: 'o1-mini', name: 'o1 Mini', description: 'Raciocínio eficiente', contextWindow: 128000, maxOutput: 65536 },
        ];
    }

    async generate(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
        if (!this.client) {
            throw new Error('OpenAI não configurado. Configure a API key nas configurações.');
        }

        const model = options.model || 'gpt-4o';
        const messages: OpenAI.ChatCompletionMessageParam[] = [];

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
        } catch (error) {
            this.logger.error(`OpenAI Error: ${error.message}`);
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
            const parsed = JSON.parse(response.content);
            return parsed.variations || [];
        } catch {
            this.logger.warn('Falha ao parsear variações, retornando array vazio');
            return [];
        }
    }

    async testConnection(): Promise<boolean> {
        if (!this.client) return false;

        try {
            await this.client.models.list();
            return true;
        } catch (error) {
            this.logger.error(`Teste de conexão OpenAI falhou: ${error.message}`);
            return false;
        }
    }

    isConfigured(): boolean {
        return this.client !== null;
    }
}
