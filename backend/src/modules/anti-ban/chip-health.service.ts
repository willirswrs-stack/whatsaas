/**
 * ChipHealthService - Chip Health Score Calculator
 * 
 * Calculates and manages health scores for WhatsApp chips/instances
 * based on multiple factors including delivery rate, block history,
 * warmup status, and behavioral patterns.
 * 
 * @principle "A healthy chip is a productive chip"
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instance } from '../instances/entities/instance.entity';
import { InstanceStatus } from '../../common/enums/instance-status.enum';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface HealthScoreFactors {
    // Base Metrics (0-100 each)
    deliverySuccessScore: number;
    warmupMaturityScore: number;
    blockHistoryScore: number;
    usageCapacityScore: number;
    activityRecencyScore: number;

    // Weighted Total
    totalScore: number;

    // Context
    weights: HealthScoreWeights;
    factors: FactorDetails[];
}

export interface HealthScoreWeights {
    deliverySuccess: number;
    warmupMaturity: number;
    blockHistory: number;
    usageCapacity: number;
    activityRecency: number;
}

export interface FactorDetails {
    name: string;
    score: number;
    weight: number;
    contribution: number;
    description: string;
}

export interface HealthStatus {
    score: number;
    status: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
    color: string;
    emoji: string;
    recommendation: string;
    canSendMessages: boolean;
    dailyLimitAdjustment: number; // Percentage adjustment (-50% to +20%)
}

export interface ChipHealthReport {
    instanceId: string;
    instanceName: string;
    currentScore: number;
    status: HealthStatus;
    factors: HealthScoreFactors;
    trend: 'improving' | 'stable' | 'declining';
    lastUpdated: Date;
    recommendations: string[];
}

// ============================================================================
// DEFAULT WEIGHTS
// ============================================================================

const DEFAULT_WEIGHTS: HealthScoreWeights = {
    deliverySuccess: 0.35,  // 35% - Most important
    warmupMaturity: 0.25,    // 25% - Critical for new chips
    blockHistory: 0.20,      // 20% - Block history matters
    usageCapacity: 0.10,     // 10% - Not overloaded
    activityRecency: 0.10,   // 10% - Recently active
};

// ============================================================================
// CHIPHEALTHSERVICE
// ============================================================================

@Injectable()
export class ChipHealthService {
    private readonly logger = new Logger(ChipHealthService.name);

    // Cache for health scores (avoids recalculating constantly)
    private healthCache: Map<string, { score: number; timestamp: Date }> = new Map();
    private readonly cacheValidityMs = 60000; // 1 minute

    constructor(
        @InjectRepository(Instance)
        private instanceRepo: Repository<Instance>,
    ) { }

    // =========================================================================
    // MAIN CALCULATION METHODS
    // =========================================================================

    /**
     * Calculate health score for an instance
     */
    async calculateHealthScore(instanceId: string): Promise<number> {
        const instance = await this.instanceRepo.findOne({
            where: { id: instanceId },
        });

        if (!instance) {
            this.logger.warn(`Instance ${instanceId} not found`);
            return 0;
        }

        return this.calculateScoreFromInstance(instance);
    }

    /**
     * Calculate detailed health score with all factors
     */
    async calculateDetailedScore(instanceId: string): Promise<HealthScoreFactors> {
        const instance = await this.instanceRepo.findOne({
            where: { id: instanceId },
        });

        if (!instance) {
            throw new Error(`Instance ${instanceId} not found`);
        }

        return this.calculateFactors(instance, DEFAULT_WEIGHTS);
    }

    /**
     * Get health status with recommendations
     */
    async getHealthStatus(instanceId: string): Promise<HealthStatus> {
        const score = await this.calculateHealthScore(instanceId);
        return this.scoreToStatus(score);
    }

    /**
     * Get complete health report for an instance
     */
    async getHealthReport(instanceId: string): Promise<ChipHealthReport> {
        const instance = await this.instanceRepo.findOne({
            where: { id: instanceId },
        });

        if (!instance) {
            throw new Error(`Instance ${instanceId} not found`);
        }

        const factors = await this.calculateDetailedScore(instanceId);
        const status = this.scoreToStatus(factors.totalScore);

        return {
            instanceId,
            instanceName: instance.instanceName,
            currentScore: factors.totalScore,
            status,
            factors,
            trend: this.calculateTrend(instanceId),
            lastUpdated: new Date(),
            recommendations: this.generateRecommendations(instance, factors),
        };
    }

    /**
     * Get health scores for all instances of a tenant
     */
    async getTenantHealthOverview(tenantId: string): Promise<Array<{
        instanceId: string;
        instanceName: string;
        score: number;
        status: HealthStatus;
    }>> {
        const instances = await this.instanceRepo.find({
            where: { tenantId },
        });

        const results: Array<{
            instanceId: string;
            instanceName: string;
            score: number;
            status: HealthStatus;
        }> = [];

        for (const instance of instances) {
            const score = this.calculateScoreFromInstance(instance);
            results.push({
                instanceId: instance.id,
                instanceName: instance.instanceName,
                score,
                status: this.scoreToStatus(score),
            });
        }

        return results.sort((a, b) => b.score - a.score);
    }

    // =========================================================================
    // FACTOR CALCULATION
    // =========================================================================

    private calculateScoreFromInstance(instance: Instance): number {
        // Check cache first
        const cached = this.healthCache.get(instance.id);
        if (cached && Date.now() - cached.timestamp.getTime() < this.cacheValidityMs) {
            return cached.score;
        }

        const factors = this.calculateFactors(instance, DEFAULT_WEIGHTS);

        // Update cache
        this.healthCache.set(instance.id, {
            score: factors.totalScore,
            timestamp: new Date(),
        });

        return factors.totalScore;
    }

    private calculateFactors(instance: Instance, weights: HealthScoreWeights): HealthScoreFactors {
        const factors: FactorDetails[] = [];
        let weightedSum = 0;

        // 1. Delivery Success Score (based on daily sent vs limit and connection status)
        const deliveryScore = this.calculateDeliverySuccessScore(instance);
        factors.push({
            name: 'Delivery Success',
            score: deliveryScore,
            weight: weights.deliverySuccess,
            contribution: deliveryScore * weights.deliverySuccess,
            description: this.getDeliveryDescription(deliveryScore),
        });
        weightedSum += deliveryScore * weights.deliverySuccess;

        // 2. Warmup Maturity Score
        const warmupScore = this.calculateWarmupMaturityScore(instance);
        factors.push({
            name: 'Warmup Maturity',
            score: warmupScore,
            weight: weights.warmupMaturity,
            contribution: warmupScore * weights.warmupMaturity,
            description: this.getWarmupDescription(instance.warmupDay || 0),
        });
        weightedSum += warmupScore * weights.warmupMaturity;

        // 3. Block History Score
        const blockScore = this.calculateBlockHistoryScore(instance);
        factors.push({
            name: 'Block History',
            score: blockScore,
            weight: weights.blockHistory,
            contribution: blockScore * weights.blockHistory,
            description: this.getBlockDescription(blockScore),
        });
        weightedSum += blockScore * weights.blockHistory;

        // 4. Usage Capacity Score
        const capacityScore = this.calculateUsageCapacityScore(instance);
        factors.push({
            name: 'Usage Capacity',
            score: capacityScore,
            weight: weights.usageCapacity,
            contribution: capacityScore * weights.usageCapacity,
            description: this.getCapacityDescription(capacityScore),
        });
        weightedSum += capacityScore * weights.usageCapacity;

        // 5. Activity Recency Score
        const activityScore = this.calculateActivityRecencyScore(instance);
        factors.push({
            name: 'Activity Recency',
            score: activityScore,
            weight: weights.activityRecency,
            contribution: activityScore * weights.activityRecency,
            description: this.getActivityDescription(activityScore),
        });
        weightedSum += activityScore * weights.activityRecency;

        return {
            deliverySuccessScore: deliveryScore,
            warmupMaturityScore: warmupScore,
            blockHistoryScore: blockScore,
            usageCapacityScore: capacityScore,
            activityRecencyScore: activityScore,
            totalScore: Math.round(weightedSum),
            weights,
            factors,
        };
    }

    // =========================================================================
    // INDIVIDUAL SCORE CALCULATIONS
    // =========================================================================

    private calculateDeliverySuccessScore(instance: Instance): number {
        // If not connected, score is 0
        if (instance.status !== InstanceStatus.CONNECTED) {
            return 0;
        }

        // Base score for being connected
        let score = 60;

        // Bonus for low daily usage (not overloaded)
        const usageRatio = (instance.dailySent || 0) / (instance.dailyLimit || 100);
        if (usageRatio < 0.5) {
            score += 30;
        } else if (usageRatio < 0.8) {
            score += 15;
        } else if (usageRatio > 1.0) {
            score -= 20; // Penalty for exceeding limit
        }

        // Additional bonus for warmup completion
        if ((instance.warmupDay || 0) >= 14) {
            score += 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    private calculateWarmupMaturityScore(instance: Instance): number {
        const warmupDay = instance.warmupDay || 0;

        // Linear progression from 0 to 100 over 21 days
        if (warmupDay >= 21) return 100;
        if (warmupDay >= 14) return 80 + ((warmupDay - 14) / 7) * 20;
        if (warmupDay >= 7) return 50 + ((warmupDay - 7) / 7) * 30;
        if (warmupDay >= 3) return 20 + ((warmupDay - 3) / 4) * 30;
        return warmupDay * 7; // 0-20 for first 3 days
    }

    private calculateBlockHistoryScore(instance: Instance): number {
        // Perfect score if never blocked
        // This would need block history from analytics in production
        // For now, use status as proxy
        if (instance.status === InstanceStatus.BANNED) {
            return 0;
        }

        // Connected = good
        if (instance.status === InstanceStatus.CONNECTED) {
            return 100;
        }

        // Other statuses
        if (instance.status === InstanceStatus.DISCONNECTED) {
            return 50;
        }

        return 70; // Default for connecting/other
    }

    private calculateUsageCapacityScore(instance: Instance): number {
        const dailySent = instance.dailySent || 0;
        const dailyLimit = instance.dailyLimit || 100;
        const usageRatio = dailySent / dailyLimit;

        // Optimal usage is 40-60%
        if (usageRatio < 0.4) return 100; // Plenty of capacity
        if (usageRatio < 0.6) return 90;  // Optimal range
        if (usageRatio < 0.8) return 70;  // Getting busy
        if (usageRatio < 1.0) return 40;  // Near limit
        return 0; // Over limit
    }

    private calculateActivityRecencyScore(instance: Instance): number {
        const connectedAt = instance.connectedAt;
        const updatedAt = instance.updatedAt;

        const lastActivity = updatedAt || connectedAt;
        if (!lastActivity) {
            return 50; // Unknown activity
        }

        const hoursSinceActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);

        if (hoursSinceActivity < 1) return 100;  // Very recent
        if (hoursSinceActivity < 6) return 90;   // Recent
        if (hoursSinceActivity < 24) return 70;  // Today
        if (hoursSinceActivity < 72) return 50;  // Recent days
        if (hoursSinceActivity < 168) return 30; // This week
        return 10; // Old
    }

    // =========================================================================
    // STATUS CONVERSION
    // =========================================================================

    private scoreToStatus(score: number): HealthStatus {
        if (score >= 85) {
            return {
                score,
                status: 'excellent',
                color: '#22c55e',
                emoji: '🟢',
                recommendation: 'Chip em excelente condição. Pode operar em capacidade máxima.',
                canSendMessages: true,
                dailyLimitAdjustment: 20,
            };
        }

        if (score >= 70) {
            return {
                score,
                status: 'good',
                color: '#84cc16',
                emoji: '🟡',
                recommendation: 'Chip em boa condição. Operação normal recomendada.',
                canSendMessages: true,
                dailyLimitAdjustment: 0,
            };
        }

        if (score >= 50) {
            return {
                score,
                status: 'moderate',
                color: '#eab308',
                emoji: '🟠',
                recommendation: 'Chip com saúde moderada. Considere reduzir volume.',
                canSendMessages: true,
                dailyLimitAdjustment: -20,
            };
        }

        if (score >= 30) {
            return {
                score,
                status: 'poor',
                color: '#f97316',
                emoji: '🔴',
                recommendation: 'Chip com saúde baixa. Reduza significativamente o volume.',
                canSendMessages: true,
                dailyLimitAdjustment: -50,
            };
        }

        return {
            score,
            status: 'critical',
            color: '#ef4444',
            emoji: '⛔',
            recommendation: 'Chip em estado crítico. Pause envios e investigue.',
            canSendMessages: false,
            dailyLimitAdjustment: -100,
        };
    }

    // =========================================================================
    // RECOMMENDATIONS
    // =========================================================================

    private generateRecommendations(instance: Instance, factors: HealthScoreFactors): string[] {
        const recommendations: string[] = [];

        // Check warmup
        if (factors.warmupMaturityScore < 50) {
            const remaining = 14 - (instance.warmupDay || 0);
            recommendations.push(
                `Continue o warmup por mais ${remaining} dias para aumentar a maturidade do chip.`
            );
        }

        // Check capacity
        if (factors.usageCapacityScore < 50) {
            recommendations.push(
                'O chip está próximo do limite diário. Distribua a carga entre mais instâncias.'
            );
        }

        // Check connection
        if (instance.status !== InstanceStatus.CONNECTED) {
            recommendations.push(
                'Reconecte o chip para restaurar a capacidade de envio.'
            );
        }

        // Check activity
        if (factors.activityRecencyScore < 50) {
            recommendations.push(
                'O chip está inativo há muito tempo. Envie algumas mensagens manuais para reativá-lo.'
            );
        }

        // General recommendations based on total score
        if (factors.totalScore < 50) {
            recommendations.push(
                'Considere usar o stack wwebjs para este chip até a saúde melhorar.'
            );
        }

        if (recommendations.length === 0) {
            recommendations.push('🎉 Chip saudável! Continue com as boas práticas.');
        }

        return recommendations;
    }

    // =========================================================================
    // DESCRIPTIONS
    // =========================================================================

    private getDeliveryDescription(score: number): string {
        if (score >= 80) return 'Excelente taxa de entrega';
        if (score >= 60) return 'Boa taxa de entrega';
        if (score >= 40) return 'Taxa de entrega moderada';
        return 'Taxa de entrega baixa';
    }

    private getWarmupDescription(warmupDay: number): string {
        if (warmupDay >= 21) return `Chip maduro (${warmupDay} dias)`;
        if (warmupDay >= 14) return `Warmup completo (${warmupDay}/14 dias)`;
        if (warmupDay >= 7) return `Warmup em progresso (${warmupDay}/14 dias)`;
        return `Chip novo (${warmupDay}/14 dias)`;
    }

    private getBlockDescription(score: number): string {
        if (score >= 80) return 'Sem histórico de bloqueios';
        if (score >= 50) return 'Histórico limpo recente';
        return 'Histórico de problemas';
    }

    private getCapacityDescription(score: number): string {
        if (score >= 80) return 'Alta capacidade disponível';
        if (score >= 50) return 'Capacidade moderada';
        return 'Próximo do limite';
    }

    private getActivityDescription(score: number): string {
        if (score >= 80) return 'Muito ativo';
        if (score >= 50) return 'Atividade recente';
        return 'Precisa de atividade';
    }

    // =========================================================================
    // TREND CALCULATION
    // =========================================================================

    private calculateTrend(instanceId: string): 'improving' | 'stable' | 'declining' {
        // Would need historical data in production
        // For now, return stable
        return 'stable';
    }

    // =========================================================================
    // CACHE MANAGEMENT
    // =========================================================================

    /**
     * Invalidate cache for an instance
     */
    invalidateCache(instanceId: string): void {
        this.healthCache.delete(instanceId);
    }

    /**
     * Clear all cache
     */
    clearCache(): void {
        this.healthCache.clear();
    }
}
