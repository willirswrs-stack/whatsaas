/**
 * LLM Provider Interface
 * Interface base para todos os provedores de LLM
 */

export interface LLMOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

export interface LLMResponse {
    content: string;
    tokensUsed: number;
    model: string;
    provider: string;
}

export interface LLMProviderInfo {
    id: string;
    name: string;
    description: string;
    models: LLMModelInfo[];
    isConfigured: boolean;
    icon: string;
    color: string;
    docsUrl: string;
}

export interface LLMModelInfo {
    id: string;
    name: string;
    description?: string;
    contextWindow?: number;
    maxOutput?: number;
}

export interface ILLMProvider {
    readonly id: string;
    readonly name: string;
    readonly icon: string;
    readonly color: string;
    readonly docsUrl: string;

    /**
     * Lista os modelos disponíveis para este provider
     */
    getAvailableModels(): LLMModelInfo[];

    /**
     * Gera uma resposta usando o LLM
     */
    generate(prompt: string, options?: LLMOptions): Promise<LLMResponse>;

    /**
     * Gera variações de texto (para content spinning)
     */
    generateVariations(text: string, count: number, options?: LLMOptions): Promise<string[]>;

    /**
     * Testa a conexão com o provider
     */
    testConnection(): Promise<boolean>;

    /**
     * Verifica se o provider está configurado (tem API key válida)
     */
    isConfigured(): boolean;
}

/**
 * Tipos de providers suportados
 */
export type LLMProviderType = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'llama' | 'custom';

/**
 * Configuração para LLM customizada
 */
export interface CustomLLMConfig {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    headers?: Record<string, string>;
}
