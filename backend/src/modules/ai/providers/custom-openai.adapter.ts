import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
  ILLMProvider,
  LLMOptions,
  LLMResponse,
  LLMModelInfo,
} from './llm-provider.interface';

@Injectable()
export class CustomOpenAIAdapter implements ILLMProvider {
  private readonly logger = new Logger(CustomOpenAIAdapter.name);
  private client: OpenAI | null = null;
  private apiKey: string | null = null;
  private baseUrl: string | null = null;

  readonly id = 'custom';
  readonly name = 'Custom (OpenAI Compatible)';
  readonly icon = '🔌';
  readonly color = '#8b5cf6';
  readonly docsUrl = '';

  constructor() {}

  /**
   * Configura o adapter com a API key e baseURL
   */
  configure(apiKey: string, baseUrl?: string): void {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || null;

    if (
      apiKey &&
      apiKey.length > 5 &&
      !apiKey.includes('placeholder') &&
      baseUrl &&
      baseUrl.startsWith('http')
    ) {
      try {
        this.client = new OpenAI({
          apiKey,
          baseURL: baseUrl,
        });
      } catch (e) {
        this.logger.error(`Erro ao instanciar Custom OpenAI: ${e.message}`);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  getAvailableModels(): LLMModelInfo[] {
    // Modelos são populados via fetch dinâmico no frontend/controller
    // Retornamos um modelo genérico padrão por segurança
    return [
      {
        id: 'default',
        name: 'Default Model',
        description: 'Modelo padrão do provedor',
        contextWindow: 4096,
        maxOutput: 4096,
      },
    ];
  }

  async generate(
    prompt: string,
    options: LLMOptions = {},
  ): Promise<LLMResponse> {
    if (!this.client) {
      throw new Error('Provedor Customizado não configurado ou URL inválida.');
    }

    const model = options.model || 'default';
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

      this.logger.log(
        `✅ Custom Provider gerou resposta (${response.usage?.total_tokens || 0} tokens)`,
      );

      return {
        content,
        tokensUsed: response.usage?.total_tokens || 0,
        model,
        provider: this.id,
      };
    } catch (error) {
      this.logger.error(`Custom Provider Error: ${error.message}`);
      throw error;
    }
  }

  async generateVariations(
    text: string,
    count: number,
    options: LLMOptions = {},
  ): Promise<string[]> {
    const systemPrompt = `Você é um especialista em copywriting. Gere ${count} variações únicas do texto fornecido, mantendo o significado original mas variando a estrutura e palavras. Responda APENAS com um JSON no formato: {"variations": ["var1", "var2", ...]}`;

    const response = await this.generate(text, {
      ...options,
      systemPrompt,
      temperature: options.temperature ?? 0.8,
    });

    try {
      // Tenta remover crases de markdown se o modelo tiver retornado com formatação
      let content = response.content.trim();
      if (content.startsWith('```json')) content = content.substring(7);
      if (content.startsWith('```')) content = content.substring(3);
      if (content.endsWith('```'))
        content = content.substring(0, content.length - 3);

      const parsed = JSON.parse(content.trim());
      return parsed.variations || [];
    } catch {
      this.logger.warn(
        'Falha ao parsear variações no Custom Provider, retornando array vazio',
      );
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      this.logger.error(
        `Teste de conexão Custom Provider falhou: ${error.message}`,
      );
      return false;
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }
}
