/**
 * StackRouterService - Intelligent Stack Selection Engine
 * 
 * Decides dynamically which WhatsApp stack to use for each message
 * based on chip health, warmup status, risk level, and campaign context.
 * 
 * @principle "All intelligence lives in WhatSaas, not in the APIs"
 */

import { Injectable, Logger } from '@nestjs/common';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type StackType = 'wwebjs' | 'waha' | 'evolution' | 'official';

export interface StackRoutingInput {
    // Chip/Instance metrics
    instanceId: string;
    warmupDays: number;
    chipHealthScore: number; // 0-100
    lastBlockedAt?: Date | null;
    daysSinceLastBlock?: number;

    // Campaign context
    campaignId: string;
    campaignVolume: number; // Total messages in campaign
    messagesSentToday: number;
    messagesRemaining: number;

    // Risk assessment
    riskLevel: 'low' | 'medium' | 'high' | 'critical';

    // Conversation context
    conversationActive: boolean; // Is this a reply in active conversation?
    lastMessageReceivedAt?: Date | null;

    // Timing metrics (from previous sends)
    averageDeliveryRate?: number; // 0-100%
    recentFailureRate?: number; // 0-100%

    // Content risk
    contentHasLinks?: boolean;
    contentHasMedia?: boolean;
    isFirstContactMessage?: boolean;
}

export interface StackRoutingResult {
    selectedStack: StackType;
    reason: string;
    confidence: number; // 0-100
    fallbackStack?: StackType;
    warnings: string[];
    metadata: {
        ruleApplied: string;
        inputSummary: string;
        timestamp: Date;
    };
}

export interface StackCapabilities {
    maxDailyVolume: number;
    humanMimetismLevel: number; // 1-10
    reliability: number; // 1-10
    speed: number; // 1-10
    costPerMessage: number; // relative cost
    supportsMedia: boolean;
    supportsPresence: boolean;
    requiresSession: boolean;
}

// ============================================================================
// STACK CAPABILITIES CONFIGURATION
// ============================================================================

const STACK_CAPABILITIES: Record<StackType, StackCapabilities> = {
    wwebjs: {
        maxDailyVolume: 100,
        humanMimetismLevel: 10, // Highest - real browser
        reliability: 7,
        speed: 5,
        costPerMessage: 0,
        supportsMedia: true,
        supportsPresence: true,
        requiresSession: true,
    },
    waha: {
        maxDailyVolume: 300,
        humanMimetismLevel: 8,
        reliability: 8,
        speed: 7,
        costPerMessage: 0,
        supportsMedia: true,
        supportsPresence: true,
        requiresSession: true,
    },
    evolution: {
        maxDailyVolume: 1000,
        humanMimetismLevel: 6,
        reliability: 9,
        speed: 9,
        costPerMessage: 0,
        supportsMedia: true,
        supportsPresence: false,
        requiresSession: true,
    },
    official: {
        maxDailyVolume: 10000,
        humanMimetismLevel: 3, // Identifiable as business
        reliability: 10,
        speed: 10,
        costPerMessage: 0.05, // Meta charges per message
        supportsMedia: true,
        supportsPresence: false,
        requiresSession: false,
    },
};

// ============================================================================
// ROUTING RULES ENGINE
// ============================================================================

interface RoutingRule {
    name: string;
    priority: number; // Lower = higher priority
    condition: (input: StackRoutingInput) => boolean;
    stack: StackType;
    confidence: number;
    reason: string;
}

const ROUTING_RULES: RoutingRule[] = [
    // =========== CRITICAL SAFETY RULES (Priority 0-10) ===========
    {
        name: 'CRITICAL_RECENTLY_BLOCKED',
        priority: 1,
        condition: (input) =>
            input.daysSinceLastBlock !== undefined && input.daysSinceLastBlock < 7,
        stack: 'wwebjs',
        confidence: 95,
        reason: 'Chip bloqueado recentemente - máximo mimetismo necessário',
    },
    {
        name: 'CRITICAL_LOW_HEALTH',
        priority: 2,
        condition: (input) => input.chipHealthScore < 30,
        stack: 'wwebjs',
        confidence: 90,
        reason: 'Saúde do chip crítica - proteção máxima ativada',
    },
    {
        name: 'CRITICAL_RISK_LEVEL',
        priority: 3,
        condition: (input) => input.riskLevel === 'critical',
        stack: 'wwebjs',
        confidence: 95,
        reason: 'Nível de risco crítico - stack mais seguro selecionado',
    },

    // =========== WARMUP RULES (Priority 10-20) ===========
    {
        name: 'WARMUP_INITIAL_PHASE',
        priority: 10,
        condition: (input) => input.warmupDays <= 3,
        stack: 'wwebjs',
        confidence: 92,
        reason: 'Warmup fase inicial (dias 1-3) - máximo cuidado',
    },
    {
        name: 'WARMUP_EARLY_PHASE',
        priority: 11,
        condition: (input) => input.warmupDays <= 7,
        stack: 'wwebjs',
        confidence: 88,
        reason: 'Warmup fase inicial (dias 4-7) - comportamento humano simulado',
    },
    {
        name: 'WARMUP_MID_PHASE',
        priority: 12,
        condition: (input) => input.warmupDays <= 14,
        stack: 'waha',
        confidence: 85,
        reason: 'Warmup fase intermediária (dias 8-14) - transição para WAHA',
    },

    // =========== CONTEXT RULES (Priority 20-30) ===========
    {
        name: 'ACTIVE_CONVERSATION',
        priority: 20,
        condition: (input) => input.conversationActive,
        stack: 'wwebjs',
        confidence: 88,
        reason: 'Conversa ativa - mimetismo humano para manter contexto',
    },
    {
        name: 'FIRST_CONTACT_HIGH_RISK',
        priority: 21,
        condition: (input) =>
            input.isFirstContactMessage === true && input.riskLevel !== 'low',
        stack: 'wwebjs',
        confidence: 85,
        reason: 'Primeira mensagem com risco elevado - proteção extra',
    },

    // =========== VOLUME-BASED RULES (Priority 30-40) ===========
    {
        name: 'HIGH_VOLUME_HEALTHY_CHIP',
        priority: 30,
        condition: (input) =>
            input.campaignVolume > 500 &&
            input.chipHealthScore >= 80 &&
            input.warmupDays > 14,
        stack: 'evolution',
        confidence: 85,
        reason: 'Alto volume com chip saudável e maduro - Evolution API',
    },
    {
        name: 'MEDIUM_VOLUME_GOOD_CHIP',
        priority: 31,
        condition: (input) =>
            input.campaignVolume > 100 &&
            input.chipHealthScore >= 60 &&
            input.warmupDays > 10,
        stack: 'waha',
        confidence: 82,
        reason: 'Volume médio com chip bom - WAHA balanceado',
    },
    {
        name: 'LOW_VOLUME_ANY_CHIP',
        priority: 32,
        condition: (input) => input.campaignVolume <= 50,
        stack: 'wwebjs',
        confidence: 80,
        reason: 'Baixo volume - wwebjs para máxima segurança',
    },

    // =========== HEALTH-BASED RULES (Priority 40-50) ===========
    {
        name: 'HEALTHY_CHIP_EVOLUTION',
        priority: 40,
        condition: (input) =>
            input.chipHealthScore >= 85 &&
            input.warmupDays > 21 &&
            input.riskLevel === 'low',
        stack: 'evolution',
        confidence: 88,
        reason: 'Chip muito saudável e maduro - Evolution para escala',
    },
    {
        name: 'MODERATE_CHIP_WAHA',
        priority: 41,
        condition: (input) =>
            input.chipHealthScore >= 50 &&
            input.chipHealthScore < 85,
        stack: 'waha',
        confidence: 78,
        reason: 'Chip moderado - WAHA com bom equilíbrio',
    },

    // =========== FALLBACK RULES (Priority 100) ===========
    {
        name: 'DEFAULT_SAFE',
        priority: 100,
        condition: () => true, // Always matches as fallback
        stack: 'waha',
        confidence: 70,
        reason: 'Regra padrão - WAHA como escolha balanceada',
    },
];

// ============================================================================
// STACKROUTERSERVICE
// ============================================================================

@Injectable()
export class StackRouterService {
    private readonly logger = new Logger(StackRouterService.name);

    /**
     * Main routing method - decides which stack to use
     */
    route(input: StackRoutingInput): StackRoutingResult {
        const startTime = Date.now();
        const warnings: string[] = [];

        // Validate input
        this.validateInput(input, warnings);

        // Calculate derived metrics
        const enrichedInput = this.enrichInput(input);

        // Find matching rule (first match wins due to priority ordering)
        const sortedRules = [...ROUTING_RULES].sort((a, b) => a.priority - b.priority);

        let matchedRule: RoutingRule | null = null;
        for (const rule of sortedRules) {
            if (rule.condition(enrichedInput)) {
                matchedRule = rule;
                break;
            }
        }

        // Should never happen due to fallback rule, but safety first
        if (!matchedRule) {
            matchedRule = ROUTING_RULES.find(r => r.name === 'DEFAULT_SAFE')!;
            warnings.push('No specific rule matched, using fallback');
        }

        // Calculate adjusted confidence based on data quality
        const adjustedConfidence = this.adjustConfidence(
            matchedRule.confidence,
            enrichedInput,
            warnings
        );

        // Determine fallback stack
        const fallbackStack = this.determineFallback(matchedRule.stack, enrichedInput);

        const result: StackRoutingResult = {
            selectedStack: matchedRule.stack,
            reason: matchedRule.reason,
            confidence: adjustedConfidence,
            fallbackStack,
            warnings,
            metadata: {
                ruleApplied: matchedRule.name,
                inputSummary: this.summarizeInput(enrichedInput),
                timestamp: new Date(),
            },
        };

        const duration = Date.now() - startTime;
        this.logger.debug(
            `🎯 Stack Router: ${result.selectedStack} (${result.confidence}%) ` +
            `| Rule: ${matchedRule.name} | ${duration}ms`
        );

        return result;
    }

    /**
     * Batch routing for campaign preview
     */
    routeBatch(
        inputs: StackRoutingInput[],
        options?: { summarize?: boolean }
    ): { results: StackRoutingResult[]; summary?: StackDistribution } {
        const results = inputs.map(input => this.route(input));

        if (options?.summarize) {
            const summary = this.summarizeDistribution(results);
            return { results, summary };
        }

        return { results };
    }

    /**
     * Get recommended stack for a specific scenario (without full input)
     */
    recommendForScenario(scenario: {
        chipAge: 'new' | 'young' | 'mature' | 'veteran';
        health: 'critical' | 'poor' | 'moderate' | 'good' | 'excellent';
        campaignSize: 'small' | 'medium' | 'large' | 'massive';
        riskTolerance: 'conservative' | 'balanced' | 'aggressive';
    }): { stack: StackType; confidence: number; notes: string[] } {
        const notes: string[] = [];

        // Map scenario to approximate values
        const warmupDays = {
            new: 2,
            young: 7,
            mature: 21,
            veteran: 60,
        }[scenario.chipAge];

        const health = {
            critical: 15,
            poor: 35,
            moderate: 55,
            good: 75,
            excellent: 92,
        }[scenario.health];

        const volume = {
            small: 30,
            medium: 150,
            large: 500,
            massive: 2000,
        }[scenario.campaignSize];

        const riskLevel = {
            conservative: 'high',
            balanced: 'medium',
            aggressive: 'low',
        }[scenario.riskTolerance] as 'low' | 'medium' | 'high';

        const mockInput: StackRoutingInput = {
            instanceId: 'mock',
            warmupDays,
            chipHealthScore: health,
            campaignId: 'mock',
            campaignVolume: volume,
            messagesSentToday: 0,
            messagesRemaining: volume,
            riskLevel,
            conversationActive: false,
        };

        const result = this.route(mockInput);

        notes.push(`Baseado em: warmup=${warmupDays}d, health=${health}, volume=${volume}`);
        notes.push(result.reason);

        return {
            stack: result.selectedStack,
            confidence: result.confidence,
            notes,
        };
    }

    /**
     * Get stack capabilities
     */
    getStackCapabilities(stack: StackType): StackCapabilities {
        return STACK_CAPABILITIES[stack];
    }

    /**
     * Get all stack capabilities for comparison
     */
    getAllStackCapabilities(): Record<StackType, StackCapabilities> {
        return { ...STACK_CAPABILITIES };
    }

    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================

    private validateInput(input: StackRoutingInput, warnings: string[]): void {
        if (input.chipHealthScore < 0 || input.chipHealthScore > 100) {
            warnings.push(`chipHealthScore fora do range (${input.chipHealthScore}), ajustado`);
            input.chipHealthScore = Math.max(0, Math.min(100, input.chipHealthScore));
        }

        if (input.warmupDays < 0) {
            warnings.push(`warmupDays negativo (${input.warmupDays}), ajustado para 0`);
            input.warmupDays = 0;
        }

        if (!input.riskLevel) {
            warnings.push('riskLevel não definido, assumindo medium');
            input.riskLevel = 'medium';
        }
    }

    private enrichInput(input: StackRoutingInput): StackRoutingInput {
        const enriched = { ...input };

        // Calculate days since last block if we have the date
        if (input.lastBlockedAt && !input.daysSinceLastBlock) {
            const now = new Date();
            const blockDate = new Date(input.lastBlockedAt);
            const diffMs = now.getTime() - blockDate.getTime();
            enriched.daysSinceLastBlock = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        // Infer risk level if not set but we have metrics
        if (input.recentFailureRate !== undefined && input.recentFailureRate > 20) {
            if (enriched.riskLevel === 'low') {
                enriched.riskLevel = 'medium';
            }
        }

        return enriched;
    }

    private adjustConfidence(
        baseConfidence: number,
        input: StackRoutingInput,
        warnings: string[]
    ): number {
        let adjustment = 0;

        // Penalize confidence if we have poor data
        if (input.averageDeliveryRate === undefined) {
            adjustment -= 5;
            warnings.push('Sem dados de delivery rate - confiança reduzida');
        }

        if (input.recentFailureRate === undefined) {
            adjustment -= 3;
        }

        // Boost confidence with good metrics
        if (input.averageDeliveryRate !== undefined && input.averageDeliveryRate > 95) {
            adjustment += 5;
        }

        // Reduce confidence for edge cases
        if (input.chipHealthScore >= 40 && input.chipHealthScore <= 60) {
            adjustment -= 5; // Uncertain zone
        }

        return Math.max(50, Math.min(100, baseConfidence + adjustment));
    }

    private determineFallback(
        primary: StackType,
        input: StackRoutingInput
    ): StackType | undefined {
        // Fallback hierarchy based on safety
        const safetyOrder: StackType[] = ['wwebjs', 'waha', 'evolution', 'official'];

        const primaryIndex = safetyOrder.indexOf(primary);

        // If primary is already most safe, fallback is next safe option
        if (primaryIndex === 0) {
            return 'waha';
        }

        // Otherwise, fallback is one step safer
        return safetyOrder[primaryIndex - 1];
    }

    private summarizeInput(input: StackRoutingInput): string {
        return `warmup=${input.warmupDays}d, health=${input.chipHealthScore}%, ` +
            `volume=${input.campaignVolume}, risk=${input.riskLevel}, ` +
            `active=${input.conversationActive}`;
    }

    private summarizeDistribution(results: StackRoutingResult[]): StackDistribution {
        const distribution: Record<StackType, number> = {
            wwebjs: 0,
            waha: 0,
            evolution: 0,
            official: 0,
        };

        const confidences: number[] = [];
        const rulesCounts: Record<string, number> = {};

        for (const result of results) {
            distribution[result.selectedStack]++;
            confidences.push(result.confidence);
            rulesCounts[result.metadata.ruleApplied] =
                (rulesCounts[result.metadata.ruleApplied] || 0) + 1;
        }

        const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

        return {
            total: results.length,
            distribution,
            percentages: {
                wwebjs: (distribution.wwebjs / results.length) * 100,
                waha: (distribution.waha / results.length) * 100,
                evolution: (distribution.evolution / results.length) * 100,
                official: (distribution.official / results.length) * 100,
            },
            averageConfidence: Math.round(avgConfidence),
            topRules: Object.entries(rulesCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([rule, count]) => ({ rule, count })),
        };
    }
}

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

export interface StackDistribution {
    total: number;
    distribution: Record<StackType, number>;
    percentages: Record<StackType, number>;
    averageConfidence: number;
    topRules: Array<{ rule: string; count: number }>;
}
