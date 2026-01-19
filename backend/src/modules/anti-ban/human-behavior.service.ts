import { Injectable, Logger } from '@nestjs/common';
import { DelayGeneratorService } from './delay-generator.service';

export interface HumanBehaviorConfig {
    // Digitação
    typing: {
        minWPM: number; // Palavras por minuto mínimo (default: 20)
        maxWPM: number; // Palavras por minuto máximo (default: 60)
        avgCharsPerWord: number; // Média de caracteres por palavra (default: 5)
    };

    // Delays entre mensagens
    delays: {
        minSeconds: number;
        maxSeconds: number;
        jitterPercent: number; // ±% variação (default: 15)
    };

    // Presença
    presence: {
        showOnlineBeforeSend: boolean;
        onlineDurationMs: [number, number]; // [min, max]
    };
}

export interface TimingMetadata {
    typingDurationMs: number;
    delayBeforeSendMs: number;
    jitterAppliedMs: number;
    totalWaitMs: number;
    wpmUsed: number;
}

const DEFAULT_CONFIG: HumanBehaviorConfig = {
    typing: {
        minWPM: 20,
        maxWPM: 60,
        avgCharsPerWord: 5,
    },
    delays: {
        minSeconds: 30,
        maxSeconds: 90,
        jitterPercent: 15,
    },
    presence: {
        showOnlineBeforeSend: true,
        onlineDurationMs: [3000, 10000],
    },
};

@Injectable()
export class HumanBehaviorService {
    private readonly logger = new Logger(HumanBehaviorService.name);

    constructor(private delayGenerator: DelayGeneratorService) { }

    /**
     * Calcula a duração de digitação baseada no conteúdo da mensagem
     * Simula um humano digitando em velocidade variável
     */
    calculateTypingDuration(
        content: string,
        config: Partial<HumanBehaviorConfig> = {},
    ): number {
        const typingConfig = { ...DEFAULT_CONFIG.typing, ...config.typing };

        // Variação aleatória de WPM entre min e max
        const wpm =
            typingConfig.minWPM +
            Math.random() * (typingConfig.maxWPM - typingConfig.minWPM);

        // Calcular tempo baseado no número de caracteres
        const charCount = content.length;
        const wordCount = charCount / typingConfig.avgCharsPerWord;
        const minutesToType = wordCount / wpm;
        const msToType = minutesToType * 60 * 1000;

        // Adicionar variação para pausas entre frases (.)
        const sentenceCount = (content.match(/[.!?]/g) || []).length;
        const pausesBetweenSentences = sentenceCount * this.randomBetween(500, 1500);

        // Adicionar pequenas pausas aleatórias (como se estivesse pensando)
        const thinkingPauses = Math.floor(wordCount / 10) * this.randomBetween(200, 800);

        const totalDuration = msToType + pausesBetweenSentences + thinkingPauses;

        // Limitar entre 2 segundos e 15 segundos
        return Math.max(2000, Math.min(15000, Math.round(totalDuration)));
    }

    /**
     * Gera metadata completa de timing para uma mensagem
     * Inclui delay de digitação, delay entre mensagens e jitter
     */
    generateTimingMetadata(
        content: string,
        config: Partial<HumanBehaviorConfig> = {},
    ): TimingMetadata {
        const fullConfig = {
            typing: { ...DEFAULT_CONFIG.typing, ...config.typing },
            delays: { ...DEFAULT_CONFIG.delays, ...config.delays },
            presence: { ...DEFAULT_CONFIG.presence, ...config.presence },
        };

        // 1. Calcular duração de digitação
        const typingDurationMs = this.calculateTypingDuration(content, config);

        // 2. Gerar delay gaussiano entre mensagens
        const baseDelay = this.delayGenerator.generateGaussianDelay(
            fullConfig.delays.minSeconds,
            fullConfig.delays.maxSeconds,
        );

        // 3. Aplicar jitter
        const jitterAppliedMs = this.delayGenerator.applyJitter(
            baseDelay * 1000,
            fullConfig.delays.jitterPercent,
        );

        const delayBeforeSendMs = Math.round(baseDelay * 1000 + jitterAppliedMs);

        // 4. WPM usado (para logs)
        const charCount = content.length;
        const wordCount = charCount / fullConfig.typing.avgCharsPerWord;
        const minutesToType = typingDurationMs / 1000 / 60;
        const wpmUsed = Math.round(wordCount / minutesToType);

        const metadata: TimingMetadata = {
            typingDurationMs,
            delayBeforeSendMs,
            jitterAppliedMs: Math.round(jitterAppliedMs),
            totalWaitMs: typingDurationMs + delayBeforeSendMs,
            wpmUsed,
        };

        this.logger.debug(
            `⏱️ Timing: typing=${typingDurationMs}ms, delay=${delayBeforeSendMs}ms, ` +
            `jitter=${metadata.jitterAppliedMs}ms, total=${metadata.totalWaitMs}ms, wpm=${wpmUsed}`,
        );

        return metadata;
    }

    /**
     * Executa a simulação de comportamento humano
     * Aguarda os tempos calculados e retorna metadata
     */
    async simulateHumanBehavior(
        content: string,
        config: Partial<HumanBehaviorConfig> = {},
        callbacks?: {
            onTypingStart?: () => Promise<void>;
            onTypingEnd?: () => Promise<void>;
        },
    ): Promise<TimingMetadata> {
        const timing = this.generateTimingMetadata(content, config);

        // 1. Delay antes de começar a digitar
        const preTypingDelay = this.randomBetween(500, 2000);
        await this.sleep(preTypingDelay);

        // 2. Simular "digitando" (chamar callback se fornecido)
        if (callbacks?.onTypingStart) {
            await callbacks.onTypingStart();
        }

        await this.sleep(timing.typingDurationMs);

        if (callbacks?.onTypingEnd) {
            await callbacks.onTypingEnd();
        }

        // 3. Delay adicional antes do envio
        await this.sleep(timing.delayBeforeSendMs);

        return timing;
    }

    /**
     * Verifica se o horário atual está dentro da janela de operação
     */
    isWithinActiveHours(
        startHour: string = '08:00',
        endHour: string = '20:00',
        timezone: string = 'America/Sao_Paulo',
    ): boolean {
        const now = new Date();

        // Converter para timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timezone,
        });

        const currentTime = formatter.format(now);
        const [currentHour, currentMinute] = currentTime.split(':').map(Number);
        const currentMinutes = currentHour * 60 + currentMinute;

        const [startH, startM] = startHour.split(':').map(Number);
        const [endH, endM] = endHour.split(':').map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    /**
     * Calcula próximo horário válido para envio
     */
    getNextActiveTime(
        startHour: string = '08:00',
        endHour: string = '20:00',
        timezone: string = 'America/Sao_Paulo',
    ): Date {
        const now = new Date();

        if (this.isWithinActiveHours(startHour, endHour, timezone)) {
            return now;
        }

        // Calcular próximo início do horário ativo
        const [startH, startM] = startHour.split(':').map(Number);

        const next = new Date(now);
        next.setHours(startH, startM, 0, 0);

        // Se já passou do horário hoje, agendar para amanhã
        if (next <= now) {
            next.setDate(next.getDate() + 1);
        }

        // Adicionar randomização de ±30 minutos
        const randomOffset = this.randomBetween(-30, 30);
        next.setMinutes(next.getMinutes() + randomOffset);

        return next;
    }

    private randomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
