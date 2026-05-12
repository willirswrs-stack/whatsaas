import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import {
    CONTENT_SPINNER_SYSTEM_PROMPT,
    contentSpinnerUserPrompt,
    WARMUP_CONVERSATION_SYSTEM_PROMPT,
    warmupConversationUserPrompt,
} from './prompts/ai.prompts';

export interface SpinResult {
    variations: string[];
    tokensUsed: number;
}

export interface WarmupConversation {
    role: string;
    content: string;
    isAudio: boolean;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private openai: OpenAI;
    private anthropicApiKey: string;

    constructor(private configService: ConfigService) {
        const openaiKey = configService.get('OPENAI_API_KEY');
        if (openaiKey && openaiKey !== 'sk-placeholder') {
            this.openai = new OpenAI({ apiKey: openaiKey });
        }
        this.anthropicApiKey = configService.get('ANTHROPIC_API_KEY', '');
    }

    /**
     * Generate message variations using AI
     */
    async generateVariations(
        originalText: string,
        count: number,
        creativity: number = 0.7,
        provider: 'openai' | 'anthropic' = 'openai',
    ): Promise<SpinResult> {
        const userPrompt = contentSpinnerUserPrompt(originalText, count, creativity);

        if (provider === 'openai') {
            return this.generateWithOpenAI(
                CONTENT_SPINNER_SYSTEM_PROMPT,
                userPrompt,
                creativity,
            );
        } else {
            return this.generateWithAntropic(
                CONTENT_SPINNER_SYSTEM_PROMPT,
                userPrompt,
            );
        }
    }

    /**
     * Generate message variations using a custom API key (per-tenant)
     */
    async generateVariationsWithKey(
        originalText: string,
        count: number,
        apiKey: string | null,
        provider: 'openai' | 'anthropic' = 'openai',
        creativity: number = 0.7,
    ): Promise<SpinResult> {
        const userPrompt = contentSpinnerUserPrompt(originalText, count, creativity);

        // Se não tem API key, usar mock
        if (!apiKey || apiKey.includes('placeholder') || apiKey.length < 10) {
            this.logger.warn('No valid API key provided, returning mock variations');
            return this.getMockVariations(userPrompt);
        }

        if (provider === 'openai') {
            return this.generateWithOpenAIKey(
                apiKey,
                CONTENT_SPINNER_SYSTEM_PROMPT,
                userPrompt,
                creativity,
            );
        } else {
            return this.generateWithAntropicKey(
                apiKey,
                CONTENT_SPINNER_SYSTEM_PROMPT,
                userPrompt,
            );
        }
    }

    /**
     * Generate using OpenAI with a specific API key
     */
    private async generateWithOpenAIKey(
        apiKey: string,
        systemPrompt: string,
        userPrompt: string,
        temperature: number,
    ): Promise<SpinResult> {
        try {
            const openaiClient = new OpenAI({ apiKey });
            const response = await openaiClient.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature,
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from OpenAI');
            }

            const result = JSON.parse(content);
            this.logger.log(`✅ OpenAI gerou ${result.variations?.length || 0} variações`);
            return {
                variations: result.variations,
                tokensUsed: response.usage?.total_tokens || 0,
            };
        } catch (error) {
            this.logger.error(`OpenAI Error: ${error.message}`);
            this.logger.warn('Falling back to mock variations');
            return this.getMockVariations(userPrompt);
        }
    }

    /**
     * Generate using Anthropic with a specific API key
     */
    private async generateWithAntropicKey(
        apiKey: string,
        systemPrompt: string,
        userPrompt: string,
    ): Promise<SpinResult> {
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userPrompt }],
                }),
            });

            const data = await response.json();

            if (data.content?.[0]?.text) {
                const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    this.logger.log(`✅ Anthropic gerou ${result.variations?.length || 0} variações`);
                    return {
                        variations: result.variations,
                        tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
                    };
                }
            }

            throw new Error('Failed to parse Anthropic response');
        } catch (error) {
            this.logger.error(`Anthropic Error: ${error.message}`);
            this.logger.warn('Falling back to mock variations');
            return this.getMockVariations(userPrompt);
        }
    }

    /**
     * Generate warm-up conversation script
     */
    async generateWarmupConversation(options: {
        messageCount: number;
        topics: string[];
    }): Promise<WarmupConversation[]> {
        const userPrompt = warmupConversationUserPrompt(
            options.messageCount,
            options.topics,
        );

        try {
            if (!this.openai) {
                return this.getMockConversation(options.messageCount);
            }

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: WARMUP_CONVERSATION_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.9,
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from OpenAI');
            }

            const result = JSON.parse(content);
            return result.conversation;

        } catch (error) {
            this.logger.error(`AI Error: ${error.message}`);
            return this.getMockConversation(options.messageCount);
        }
    }

    /**
     * Synthesize text to audio speech using OpenAI TTS
     * Returns audio buffer
     */
    async synthesizeSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy'): Promise<Buffer> {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized (missing API KEY)');
        }

        try {
            this.logger.log(`[TTS] Synthesizing speech: "${text.substring(0, 30)}..."`);
            
            const mp3 = await this.openai.audio.speech.create({
                model: "tts-1",
                voice: voice,
                input: text,
            });

            const buffer = Buffer.from(await mp3.arrayBuffer());
            return buffer;
        } catch (error: any) {
            this.logger.error(`TTS Generation Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate using OpenAI
     */
    private async generateWithOpenAI(
        systemPrompt: string,
        userPrompt: string,
        temperature: number,
    ): Promise<SpinResult> {
        if (!this.openai) {
            this.logger.warn('OpenAI not configured, returning mock variations');
            return this.getMockVariations(userPrompt);
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature,
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from OpenAI');
            }

            const result = JSON.parse(content);
            return {
                variations: result.variations,
                tokensUsed: response.usage?.total_tokens || 0,
            };

        } catch (error) {
            this.logger.error(`OpenAI Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate using Anthropic Claude
     */
    private async generateWithAntropic(
        systemPrompt: string,
        userPrompt: string,
    ): Promise<SpinResult> {
        if (!this.anthropicApiKey || this.anthropicApiKey === 'sk-placeholder') {
            this.logger.warn('Anthropic not configured, returning mock variations');
            return this.getMockVariations(userPrompt);
        }

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.anthropicApiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userPrompt }],
                }),
            });

            const data = await response.json();

            if (data.content?.[0]?.text) {
                const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    return {
                        variations: result.variations,
                        tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
                    };
                }
            }

            throw new Error('Failed to parse Anthropic response');

        } catch (error) {
            this.logger.error(`Anthropic Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Mock variations for development/testing - generates more distinct variations
     */
    private getMockVariations(userPrompt: string): SpinResult {
        const countMatch = userPrompt.match(/Gere (\d+) variações/);
        const count = countMatch ? parseInt(countMatch[1]) : 5;

        const baseMessage = userPrompt.match(/---\n([\s\S]*?)\n---/)?.[1] ||
            'Olá {{nome}}! Temos uma oferta especial para você.';

        const variations: string[] = [];

        // Estruturas diferentes para variações mais distintas
        const templates = [
            '{{greeting}} {{nome}}! {{message}} {{emoji}}',
            '{{emoji}} {{greeting}}, {{nome}}! {{message}}',
            '{{nome}}, {{greeting}}! {{message}} {{emoji}}',
            '{{greeting}} {{nome}}! {{emoji}} {{message}}',
            '{{nome}}! {{greeting}}! {{message}} {{emoji}}',
        ];

        const greetings = ['Oi', 'Olá', 'E aí', 'Eai', 'Hey', 'Opa', 'Fala', 'E aee', 'Oii', 'Tudo bem'];
        const emojis = ['🎉', '✨', '🔥', '💫', '🚀', '⭐', '💪', '👋', '😊', '🙌', ''];
        const connectors = ['Passando aqui pra', 'Vim aqui te', 'Queria te', 'Só passando pra'];

        // Extrair a mensagem base sem saudação
        const msgPart = baseMessage.replace(/^(Olá|Oi|E aí|Hey|Opa)\s*/i, '').replace(/{{nome}}!?\s*/gi, '').trim();

        for (let i = 0; i < count; i++) {
            const greeting = greetings[i % greetings.length];
            const emoji = emojis[i % emojis.length];
            const template = templates[i % templates.length];
            const connector = connectors[i % connectors.length];

            // Alternar entre estruturas diferentes
            let variation: string;
            if (i % 3 === 0) {
                variation = `${greeting} {{nome}}! ${msgPart} ${emoji}`.trim();
            } else if (i % 3 === 1) {
                variation = `${emoji} ${greeting}, {{nome}}! ${connector} avisar: ${msgPart}`.trim();
            } else {
                variation = `{{nome}}, ${greeting.toLowerCase()}! ${msgPart} ${emoji}`.trim();
            }

            // Evitar duplicatas
            if (!variations.includes(variation)) {
                variations.push(variation);
            } else {
                variations.push(`${greeting} {{nome}}! 📢 ${msgPart} ${emoji}`);
            }
        }

        this.logger.log(`📝 Geradas ${variations.length} variações mock (sem API key)`);
        return { variations, tokensUsed: 0 };
    }

    /**
     * Mock conversation for development/testing
     */
    private getMockConversation(messageCount: number): WarmupConversation[] {
        const conversation: WarmupConversation[] = [];
        const messages = [
            { role: 'A', content: 'E aí, tudo bem?', isAudio: false },
            { role: 'B', content: 'Tudo ótimo! E vc?', isAudio: false },
            { role: 'A', content: 'De boa, trabalhando aqui', isAudio: false },
            { role: 'B', content: 'Sei como é haha', isAudio: false },
            { role: 'A', content: 'Viu o jogo ontem?', isAudio: true },
            { role: 'B', content: 'Vi sim, que jogo!', isAudio: false },
            { role: 'A', content: 'Demais né, time jogou bem', isAudio: false },
            { role: 'B', content: 'Sim, melhor jogo do ano', isAudio: false },
            { role: 'A', content: 'Bora sair final de semana?', isAudio: false },
            { role: 'B', content: 'Bora! Chama o pessoal', isAudio: true },
        ];

        for (let i = 0; i < messageCount; i++) {
            conversation.push(messages[i % messages.length]);
        }

        return conversation;
    }

    /**
     * Generate a single response using AI (Chat Mode)
     */
    async generateResponseWithKey(
        systemPrompt: string,
        userMessage: string,
        apiKey: string | null,
        provider: 'openai' | 'anthropic' = 'openai',
    ): Promise<string> {
        // Fallback or Mock
        if (!apiKey || apiKey.includes('placeholder') || apiKey.length < 10) {
            this.logger.warn('No valid API key provided, returning mock response');
            return `[MOCK AI RESPONSE] Processed: ${userMessage} (System: ${systemPrompt})`;
        }

        if (provider === 'openai') {
            return this.chatWithOpenAIKey(
                apiKey,
                systemPrompt,
                userMessage
            );
        } else {
            // Default to OpenAI for now
            return this.chatWithOpenAIKey(
                apiKey,
                systemPrompt,
                userMessage
            );
        }
    }

    private async chatWithOpenAIKey(
        apiKey: string,
        systemPrompt: string,
        userPrompt: string
    ): Promise<string> {
        try {
            const openaiClient = new OpenAI({ apiKey });
            const response = await openaiClient.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.95,
            });

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            this.logger.error(`OpenAI Chat Error: ${error.message}`);
            return `[ERROR AI] ${error.message}`;
        }
    }
}
