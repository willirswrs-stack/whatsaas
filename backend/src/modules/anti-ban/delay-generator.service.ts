import { Injectable, Logger } from '@nestjs/common';

export type DelayDistribution = 'gaussian' | 'uniform' | 'exponential';

@Injectable()
export class DelayGeneratorService {
    private readonly logger = new Logger(DelayGeneratorService.name);

    /**
     * Gera delay com distribuição gaussiana (normal)
     * Simula variabilidade humana natural
     *
     * @param minSeconds - Delay mínimo em segundos
     * @param maxSeconds - Delay máximo em segundos
     * @returns Delay em segundos (com decimais para "segundos quebrados")
     */
    generateGaussianDelay(minSeconds: number, maxSeconds: number): number {
        const mean = (minSeconds + maxSeconds) / 2;
        const stdDev = (maxSeconds - minSeconds) / 6; // 99.7% dentro do range

        // Box-Muller transform para gerar valor gaussiano
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

        let delay = mean + z * stdDev;

        // Garantir limites
        delay = Math.max(minSeconds, Math.min(maxSeconds, delay));

        // Segundos "quebrados" (não inteiros) - 3 casas decimais
        delay = Math.round(delay * 1000) / 1000;

        this.logger.debug(
            `Generated gaussian delay: ${delay}s (range: ${minSeconds}-${maxSeconds}s)`,
        );

        return delay;
    }

    /**
     * Gera delay com distribuição uniforme simples
     */
    generateUniformDelay(minSeconds: number, maxSeconds: number): number {
        const delay = minSeconds + Math.random() * (maxSeconds - minSeconds);
        return Math.round(delay * 1000) / 1000;
    }

    /**
     * Gera delay com distribuição exponencial
     * Mais natural para tempos de resposta humanos
     */
    generateExponentialDelay(
        minSeconds: number,
        maxSeconds: number,
        lambda: number = 0.5,
    ): number {
        // Inversa da CDF exponencial: F^(-1)(u) = -ln(1-u)/lambda
        const u = Math.random();
        let delay = -Math.log(1 - u) / lambda;

        // Escalar para o range desejado
        const range = maxSeconds - minSeconds;
        delay = minSeconds + (delay * range) / 3; // /3 para manter maioria no range

        // Garantir limites
        delay = Math.max(minSeconds, Math.min(maxSeconds, delay));

        return Math.round(delay * 1000) / 1000;
    }

    /**
     * Aplica jitter (variação aleatória) a um delay
     *
     * @param delayMs - Delay original em milissegundos
     * @param jitterPercent - Porcentagem de variação (ex: 15 para ±15%)
     * @returns Variação aplicada em milissegundos (pode ser negativo)
     */
    applyJitter(delayMs: number, jitterPercent: number = 15): number {
        const maxJitter = delayMs * (jitterPercent / 100);
        const jitter = (Math.random() * 2 - 1) * maxJitter; // -maxJitter a +maxJitter
        return jitter;
    }

    /**
     * Gera delay baseado na configuração
     */
    generateDelay(
        minSeconds: number,
        maxSeconds: number,
        distribution: DelayDistribution = 'gaussian',
        jitterPercent: number = 15,
    ): { delaySeconds: number; jitterMs: number; totalMs: number } {
        let baseDelay: number;

        switch (distribution) {
            case 'gaussian':
                baseDelay = this.generateGaussianDelay(minSeconds, maxSeconds);
                break;
            case 'exponential':
                baseDelay = this.generateExponentialDelay(minSeconds, maxSeconds);
                break;
            case 'uniform':
            default:
                baseDelay = this.generateUniformDelay(minSeconds, maxSeconds);
        }

        const baseMs = baseDelay * 1000;
        const jitterMs = this.applyJitter(baseMs, jitterPercent);
        const totalMs = Math.max(minSeconds * 1000, baseMs + jitterMs);

        return {
            delaySeconds: baseDelay,
            jitterMs: Math.round(jitterMs),
            totalMs: Math.round(totalMs),
        };
    }

    /**
     * Calcula delay progressivo para warmup
     * Chips novos devem enviar mais devagar
     *
     * @param warmupDay - Dia atual do warmup (1-14)
     * @param baseMinSeconds - Delay mínimo base
     * @param baseMaxSeconds - Delay máximo base
     */
    calculateWarmupDelay(
        warmupDay: number,
        baseMinSeconds: number = 60,
        baseMaxSeconds: number = 180,
    ): { minSeconds: number; maxSeconds: number } {
        // Dias 1-3: delays muito longos (3-5x do base)
        // Dias 4-7: delays médios (2-3x do base)
        // Dias 8-14: delays normais (1-2x do base)
        // Dia 15+: delay base

        let multiplier: number;

        if (warmupDay <= 3) {
            multiplier = 4 - (warmupDay - 1) * 0.5; // 4x, 3.5x, 3x
        } else if (warmupDay <= 7) {
            multiplier = 3 - (warmupDay - 3) * 0.25; // 2.75x, 2.5x, 2.25x, 2x
        } else if (warmupDay <= 14) {
            multiplier = 2 - (warmupDay - 7) * 0.14; // 1.86x ... 1x
        } else {
            multiplier = 1;
        }

        return {
            minSeconds: Math.round(baseMinSeconds * multiplier),
            maxSeconds: Math.round(baseMaxSeconds * multiplier),
        };
    }

    /**
     * Calcula horário randomizado com offset
     * Evita padrões de envio sempre no mesmo horário
     *
     * @param baseHour - Hora base (ex: "08:00")
     * @param offsetMinutes - Variação máxima em minutos (ex: 30 para ±30min)
     */
    randomizeScheduleTime(baseHour: string, offsetMinutes: number = 30): string {
        const [hour, minute] = baseHour.split(':').map(Number);
        const baseMinutes = hour * 60 + minute;

        const offset = Math.round((Math.random() * 2 - 1) * offsetMinutes);
        let randomizedMinutes = baseMinutes + offset;

        // Garantir que não passa de 23:59
        randomizedMinutes = Math.max(0, Math.min(23 * 60 + 59, randomizedMinutes));

        const newHour = Math.floor(randomizedMinutes / 60);
        const newMinute = randomizedMinutes % 60;

        return `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
    }
}
