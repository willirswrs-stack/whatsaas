import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

export interface PatternBreakingConfig {
    greetingStyle: 'formal' | 'casual' | 'direct' | 'mixed' | 'none' | 'random';
    enableEmojiRandomization: boolean;
    enablePunctuationVariation: boolean;
    enableCasingVariation: boolean;
    mediaTextOrder: 'text_first' | 'media_first' | 'random' | 'alternate';
}

export interface BrokenMessage {
    content: string;
    contentHash: string;
    greeting: string;
    transformationsApplied: string[];
}

const DEFAULT_CONFIG: PatternBreakingConfig = {
    greetingStyle: 'mixed',
    enableEmojiRandomization: true,
    enablePunctuationVariation: true,
    enableCasingVariation: false,
    mediaTextOrder: 'random',
};

@Injectable()
export class PatternBreakerService {
    private readonly logger = new Logger(PatternBreakerService.name);

    // Pools de saudações
    private readonly GREETING_POOLS = {
        formal: [
            'Olá {{nome}},',
            'Prezado(a) {{nome}},',
            'Bom dia, {{nome}}!',
            'Boa tarde, {{nome}}!',
            'Boa noite, {{nome}}!',
        ],
        casual: [
            'Oi {{nome}}!',
            'E aí {{nome}}!',
            'Fala {{nome}}!',
            'Opa {{nome}}!',
            '{{nome}}, tudo bem?',
            'Oiee {{nome}} 😊',
            'Oi {{nome}}, tudo certo?',
            'Eai {{nome}}, beleza?',
        ],
        direct: ['{{nome}},', 'Ei {{nome}},', '{{nome}}!', '{{nome}} -'],
        none: [''],
    };

    // Variações de emojis por categoria
    private readonly EMOJI_VARIATIONS: Record<string, string[]> = {
        happy: ['😊', '😄', '🙂', '😃', '☺️'],
        wink: ['😉', '😏', '🙃'],
        heart: ['❤️', '💙', '💚', '🧡', '💜', '♥️'],
        fire: ['🔥', '💥', '⚡'],
        thumb: ['👍', '👌', '✅', '💪'],
        money: ['💰', '💵', '🤑', '💸'],
        rocket: ['🚀', '📈', '💹'],
        celebration: ['🎉', '🎊', '✨', '🌟'],
    };

    // Estado para alternância
    private lastMediaOrder: 'text' | 'media' = 'text';
    private recentHashes: Set<string> = new Set();

    constructor() {
        // Limpar hashes antigos a cada hora
        setInterval(() => {
            this.recentHashes.clear();
        }, 60 * 60 * 1000);
    }

    /**
     * Aplica quebra de padrão completa em uma mensagem
     */
    breakPattern(
        template: string,
        contactName: string,
        config: Partial<PatternBreakingConfig> = {},
    ): BrokenMessage {
        const fullConfig = { ...DEFAULT_CONFIG, ...config };
        const transformations: string[] = [];

        let content = template;

        // 1. Adicionar saudação variada
        const greeting = this.selectGreeting(contactName, fullConfig.greetingStyle);
        if (greeting) {
            content = `${greeting}\n\n${content}`;
            transformations.push(`greeting:${fullConfig.greetingStyle}`);
        }

        // 2. Substituir variáveis do contato
        content = this.replaceContactVariables(content, contactName);

        // 3. Randomizar emojis
        if (fullConfig.enableEmojiRandomization) {
            const { text, changed } = this.randomizeEmojis(content);
            content = text;
            if (changed) {
                transformations.push('emoji_randomized');
            }
        }

        // 4. Variar pontuação
        if (fullConfig.enablePunctuationVariation) {
            const { text, changed } = this.varyPunctuation(content);
            content = text;
            if (changed) {
                transformations.push('punctuation_varied');
            }
        }

        // 5. Gerar hash do conteúdo
        const contentHash = this.generateContentHash(content);

        // 6. Verificar unicidade (regenerar se duplicado)
        if (this.recentHashes.has(contentHash)) {
            this.logger.warn('Hash duplicado detectado, aplicando variação extra');
            content = this.applyExtraVariation(content);
            transformations.push('extra_variation');
        }

        this.recentHashes.add(contentHash);

        return {
            content,
            contentHash,
            greeting,
            transformationsApplied: transformations,
        };
    }

    /**
     * Seleciona uma saudação aleatória do pool
     */
    selectGreeting(name: string, style: PatternBreakingConfig['greetingStyle']): string {
        if (style === 'none') {
            return '';
        }

        let pool: string[];

        if (style === 'mixed' || style === 'random') {
            // Misturar todos os estilos
            const allStyles = ['formal', 'casual', 'direct'] as const;
            const randomStyle = allStyles[Math.floor(Math.random() * allStyles.length)];
            pool = this.GREETING_POOLS[randomStyle] || this.GREETING_POOLS.casual;
        } else {
            // Use type assertion or check if style key exists
            pool = this.GREETING_POOLS[style as keyof typeof this.GREETING_POOLS] || this.GREETING_POOLS.casual;
        }

        const template = pool[Math.floor(Math.random() * pool.length)];
        return template.replace(/\{\{nome\}\}/gi, name || 'Cliente');
    }

    /**
     * Substitui variáveis padrão do contato
     */
    replaceContactVariables(content: string, name: string): string {
        const firstName = name?.split(' ')[0] || 'Cliente';

        return content
            .replace(/\{\{nome\}\}/gi, name || 'Cliente')
            .replace(/\{\{primeiro_nome\}\}/gi, firstName)
            .replace(/\{\{Nome\}\}/g, name || 'Cliente')
            .replace(/\{\{NOME\}\}/g, (name || 'Cliente').toUpperCase());
    }

    /**
     * Randomiza emojis existentes por variações semelhantes
     */
    randomizeEmojis(content: string): { text: string; changed: boolean } {
        let changed = false;
        let result = content;

        for (const [category, emojis] of Object.entries(this.EMOJI_VARIATIONS)) {
            for (const emoji of emojis) {
                if (result.includes(emoji) && Math.random() > 0.5) {
                    const replacement = emojis[Math.floor(Math.random() * emojis.length)];
                    if (emoji !== replacement) {
                        result = result.replace(emoji, replacement);
                        changed = true;
                    }
                }
            }
        }

        return { text: result, changed };
    }

    /**
     * Varia pontuação sutilmente
     */
    varyPunctuation(content: string): { text: string; changed: boolean } {
        let changed = false;
        let result = content;

        // Variar número de pontos de exclamação
        if (result.includes('!!!') && Math.random() > 0.5) {
            result = result.replace('!!!', Math.random() > 0.5 ? '!!' : '!');
            changed = true;
        }

        // Adicionar ou remover espaços antes de emojis
        if (Math.random() > 0.7) {
            result = result.replace(/(\S)([\u{1F600}-\u{1F6FF}])/gu, '$1 $2');
            changed = true;
        }

        // Variar vírgulas por ponto e vírgula ocasionalmente
        if (Math.random() > 0.9) {
            const commaMatch = result.match(/,/g);
            if (commaMatch && commaMatch.length > 2) {
                result = result.replace(',', ';');
                changed = true;
            }
        }

        return { text: result, changed };
    }

    /**
     * Determina ordem de envio texto/mídia
     */
    determineMediaOrder(
        strategy: PatternBreakingConfig['mediaTextOrder'],
    ): 'text_first' | 'media_first' {
        switch (strategy) {
            case 'text_first':
                return 'text_first';
            case 'media_first':
                return 'media_first';
            case 'random':
                return Math.random() > 0.5 ? 'text_first' : 'media_first';
            case 'alternate':
                this.lastMediaOrder = this.lastMediaOrder === 'text' ? 'media' : 'text';
                return this.lastMediaOrder === 'text' ? 'text_first' : 'media_first';
            default:
                return 'text_first';
        }
    }

    /**
     * Gera hash SHA256 normalizado do conteúdo
     */
    generateContentHash(content: string): string {
        const normalized = content
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') // Remove emojis
            .trim();

        return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
    }

    /**
     * Verifica unicidade do hash
     */
    isHashUnique(hash: string): boolean {
        return !this.recentHashes.has(hash);
    }

    /**
     * Aplica variação extra quando hash é duplicado
     */
    private applyExtraVariation(content: string): string {
        const variations = [
            // Adicionar espaço extra
            () => content.replace('. ', '.  '),
            // Adicionar emoji no final se não tiver
            () => (content.match(/[\u{1F600}-\u{1F6FF}]/gu) ? content : content + ' 😊'),
            // Trocar primeira letra maiúscula
            () => content.charAt(0).toLowerCase() + content.slice(1),
            // Adicionar uma quebra de linha extra
            () => content.replace('\n\n', '\n\n\n'),
        ];

        const variation = variations[Math.floor(Math.random() * variations.length)];
        return variation();
    }

    /**
     * Gera múltiplas variações de um template (para cache)
     */
    generateVariations(
        template: string,
        contactName: string,
        count: number = 10,
        config: Partial<PatternBreakingConfig> = {},
    ): BrokenMessage[] {
        const variations: BrokenMessage[] = [];
        const usedHashes = new Set<string>();

        let attempts = 0;
        const maxAttempts = count * 3;

        while (variations.length < count && attempts < maxAttempts) {
            const broken = this.breakPattern(template, contactName, config);

            if (!usedHashes.has(broken.contentHash)) {
                usedHashes.add(broken.contentHash);
                variations.push(broken);
            }

            attempts++;
        }

        this.logger.debug(
            `Generated ${variations.length}/${count} unique variations in ${attempts} attempts`,
        );

        return variations;
    }
}
