/**
 * AntiBanAnalytics - Observability & Metrics Engine
 * 
 * Provides comprehensive analytics for the anti-ban system:
 * - Success/failure rates by stack
 * - Chip health trends
 * - Pattern detection for anomalies
 * - Real-time metrics aggregation
 * 
 * @principle "You can't improve what you can't measure"
 */

import { Injectable, Logger } from '@nestjs/common';
import { StackType } from './stack-router.service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface MessageEvent {
    instanceId: string;
    campaignId: string;
    contactId: string;
    stack: StackType;
    status: 'sent' | 'delivered' | 'read' | 'failed' | 'blocked';
    timestamp: Date;
    durationMs?: number;
    errorCode?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
}

export interface InstanceMetrics {
    instanceId: string;
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalBlocked: number;
    deliveryRate: number;
    failureRate: number;
    blockRate: number;
    averageDeliveryTimeMs: number;
    lastActivityAt: Date;
    healthScore: number;
    trend: 'improving' | 'stable' | 'declining' | 'critical';
}

export interface StackMetrics {
    stack: StackType;
    totalMessages: number;
    successRate: number;
    failureRate: number;
    blockRate: number;
    averageLatencyMs: number;
    peakHour: number;
    lastHourVolume: number;
}

export interface CampaignMetrics {
    campaignId: string;
    totalContacts: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    blocked: number;
    progressPercent: number;
    estimatedCompletionTime: Date | null;
    averageDeliveryRate: number;
    stackDistribution: Record<StackType, number>;
}

export interface AnomalyAlert {
    id: string;
    type: 'spike_failures' | 'block_detected' | 'delivery_drop' | 'rate_limit' | 'pattern_detected';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    instanceId?: string;
    campaignId?: string;
    detectedAt: Date;
    metadata: Record<string, any>;
}

export interface HealthTrend {
    instanceId: string;
    timestamps: Date[];
    scores: number[];
    trend: 'up' | 'down' | 'stable';
    prediction: number; // Score estimado em 24h
}

export interface DashboardData {
    overview: {
        totalMessagesSent24h: number;
        overallDeliveryRate: number;
        activeInstances: number;
        activeCampaigns: number;
        healthyChips: number;
        atRiskChips: number;
    };
    hourlyVolume: Array<{ hour: number; count: number }>;
    stackPerformance: StackMetrics[];
    topInstances: InstanceMetrics[];
    recentAlerts: AnomalyAlert[];
    healthTrends: HealthTrend[];
}

// ============================================================================
// IN-MEMORY STORAGE (para MVP - produção usaria Redis/TimescaleDB)
// ============================================================================

interface EventStore {
    events: MessageEvent[];
    maxEvents: number;
}

interface MetricsCache {
    instances: Map<string, InstanceMetrics>;
    campaigns: Map<string, CampaignMetrics>;
    stacks: Map<StackType, StackMetrics>;
    lastUpdated: Date;
}

// ============================================================================
// ANTIBANANALYTICS SERVICE
// ============================================================================

@Injectable()
export class AntiBanAnalyticsService {
    private readonly logger = new Logger(AntiBanAnalyticsService.name);

    // Event store (circular buffer)
    private eventStore: EventStore = {
        events: [],
        maxEvents: 100000, // Keep last 100k events in memory
    };

    // Metrics cache
    private metricsCache: MetricsCache = {
        instances: new Map(),
        campaigns: new Map(),
        stacks: new Map(),
        lastUpdated: new Date(),
    };

    // Alerts
    private alerts: AnomalyAlert[] = [];
    private readonly maxAlerts = 1000;

    // Health history for trends (instanceId -> scores with timestamps)
    private healthHistory: Map<string, Array<{ timestamp: Date; score: number }>> = new Map();

    // Thresholds for anomaly detection
    private readonly thresholds = {
        failureRateWarning: 10, // %
        failureRateCritical: 25, // %
        blockRateWarning: 2, // %
        blockRateCritical: 5, // %
        deliveryDropPercent: 20, // % drop triggers alert
        minEventsForAnalysis: 10,
    };

    // =========================================================================
    // EVENT RECORDING
    // =========================================================================

    /**
     * Record a message event
     */
    recordEvent(event: MessageEvent): void {
        // Add to circular buffer
        this.eventStore.events.push(event);
        if (this.eventStore.events.length > this.eventStore.maxEvents) {
            this.eventStore.events.shift();
        }

        // Update real-time metrics
        this.updateInstanceMetrics(event);
        this.updateCampaignMetrics(event);
        this.updateStackMetrics(event);

        // Check for anomalies
        this.detectAnomalies(event);

        this.logger.debug(
            `📊 Event recorded: ${event.status} for ${event.instanceId} via ${event.stack}`
        );
    }

    /**
     * Record message sent
     */
    recordSent(
        instanceId: string,
        campaignId: string,
        contactId: string,
        stack: StackType,
        durationMs?: number
    ): void {
        this.recordEvent({
            instanceId,
            campaignId,
            contactId,
            stack,
            status: 'sent',
            timestamp: new Date(),
            durationMs,
        });
    }

    /**
     * Record message delivered
     */
    recordDelivered(instanceId: string, campaignId: string, contactId: string): void {
        this.recordEvent({
            instanceId,
            campaignId,
            contactId,
            stack: 'waha', // Will be enriched from previous event
            status: 'delivered',
            timestamp: new Date(),
        });
    }

    /**
     * Record message failed
     */
    recordFailed(
        instanceId: string,
        campaignId: string,
        contactId: string,
        stack: StackType,
        errorCode: string,
        errorMessage: string
    ): void {
        this.recordEvent({
            instanceId,
            campaignId,
            contactId,
            stack,
            status: 'failed',
            timestamp: new Date(),
            errorCode,
            errorMessage,
        });
    }

    /**
     * Record instance blocked/banned
     */
    recordBlocked(instanceId: string, campaignId: string, reason: string): void {
        this.recordEvent({
            instanceId,
            campaignId,
            contactId: '',
            stack: 'waha',
            status: 'blocked',
            timestamp: new Date(),
            errorMessage: reason,
        });

        // Immediate alert for blocks
        this.createAlert({
            type: 'block_detected',
            severity: 'critical',
            message: `Instância ${instanceId} foi bloqueada: ${reason}`,
            instanceId,
            campaignId,
            metadata: { reason },
        });
    }

    // =========================================================================
    // METRICS RETRIEVAL
    // =========================================================================

    /**
     * Get metrics for a specific instance
     */
    getInstanceMetrics(instanceId: string): InstanceMetrics | null {
        return this.metricsCache.instances.get(instanceId) || null;
    }

    /**
     * Get metrics for all instances
     */
    getAllInstanceMetrics(): InstanceMetrics[] {
        return Array.from(this.metricsCache.instances.values());
    }

    /**
     * Get metrics for a specific campaign
     */
    getCampaignMetrics(campaignId: string): CampaignMetrics | null {
        return this.metricsCache.campaigns.get(campaignId) || null;
    }

    /**
     * Get metrics by stack
     */
    getStackMetrics(stack?: StackType): StackMetrics | StackMetrics[] {
        if (stack) {
            return this.metricsCache.stacks.get(stack) || this.createEmptyStackMetrics(stack);
        }
        return Array.from(this.metricsCache.stacks.values());
    }

    /**
     * Get dashboard data
     */
    getDashboardData(): DashboardData {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Filter events from last 24h
        const recentEvents = this.eventStore.events.filter(
            e => e.timestamp >= last24h
        );

        // Calculate overview
        const sentEvents = recentEvents.filter(e => e.status === 'sent');
        const deliveredEvents = recentEvents.filter(e => e.status === 'delivered');
        const uniqueInstances = new Set(recentEvents.map(e => e.instanceId));
        const uniqueCampaigns = new Set(recentEvents.map(e => e.campaignId));

        const allInstances = this.getAllInstanceMetrics();
        const healthyChips = allInstances.filter(i => i.healthScore >= 70).length;
        const atRiskChips = allInstances.filter(i => i.healthScore < 50).length;

        // Hourly volume
        const hourlyVolume = this.calculateHourlyVolume(recentEvents);

        // Stack performance
        const stackPerformance = Array.from(this.metricsCache.stacks.values());

        // Top instances (by volume)
        const topInstances = allInstances
            .sort((a, b) => b.totalSent - a.totalSent)
            .slice(0, 10);

        // Recent alerts
        const recentAlerts = this.alerts
            .filter(a => a.detectedAt >= last24h)
            .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
            .slice(0, 20);

        // Health trends
        const healthTrends = this.calculateHealthTrends();

        return {
            overview: {
                totalMessagesSent24h: sentEvents.length,
                overallDeliveryRate: sentEvents.length > 0
                    ? (deliveredEvents.length / sentEvents.length) * 100
                    : 0,
                activeInstances: uniqueInstances.size,
                activeCampaigns: uniqueCampaigns.size,
                healthyChips,
                atRiskChips,
            },
            hourlyVolume,
            stackPerformance,
            topInstances,
            recentAlerts,
            healthTrends,
        };
    }

    /**
     * Calculate health score for an instance
     */
    calculateHealthScore(instanceId: string): number {
        const metrics = this.metricsCache.instances.get(instanceId);
        if (!metrics || metrics.totalSent < this.thresholds.minEventsForAnalysis) {
            return 50; // Default score for new instances
        }

        let score = 100;

        // Penalize for failures
        score -= metrics.failureRate * 1.5;

        // Heavy penalty for blocks
        score -= metrics.blockRate * 10;

        // Bonus for good delivery rate
        if (metrics.deliveryRate > 95) {
            score += 5;
        }

        // Penalty for declining trend
        if (metrics.trend === 'declining') {
            score -= 10;
        } else if (metrics.trend === 'critical') {
            score -= 25;
        }

        // Clamp to 0-100
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Get alerts
     */
    getAlerts(options?: {
        severity?: 'info' | 'warning' | 'critical';
        instanceId?: string;
        limit?: number;
    }): AnomalyAlert[] {
        let filtered = [...this.alerts];

        if (options?.severity) {
            filtered = filtered.filter(a => a.severity === options.severity);
        }

        if (options?.instanceId) {
            filtered = filtered.filter(a => a.instanceId === options.instanceId);
        }

        filtered.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

        if (options?.limit) {
            filtered = filtered.slice(0, options.limit);
        }

        return filtered;
    }

    /**
     * Get success rate by stack in time window
     */
    getStackSuccessRates(windowHours: number = 24): Record<StackType, { sent: number; success: number; rate: number }> {
        const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
        const recentEvents = this.eventStore.events.filter(e => e.timestamp >= cutoff);

        const rates: Record<StackType, { sent: number; success: number; rate: number }> = {
            wwebjs: { sent: 0, success: 0, rate: 0 },
            waha: { sent: 0, success: 0, rate: 0 },
            evolution: { sent: 0, success: 0, rate: 0 },
            official: { sent: 0, success: 0, rate: 0 },
        };

        for (const event of recentEvents) {
            if (event.status === 'sent') {
                rates[event.stack].sent++;
            } else if (event.status === 'delivered' || event.status === 'read') {
                rates[event.stack].success++;
            }
        }

        for (const stack of Object.keys(rates) as StackType[]) {
            if (rates[stack].sent > 0) {
                rates[stack].rate = (rates[stack].success / rates[stack].sent) * 100;
            }
        }

        return rates;
    }

    // =========================================================================
    // PRIVATE METHODS - METRICS UPDATES
    // =========================================================================

    private updateInstanceMetrics(event: MessageEvent): void {
        let metrics = this.metricsCache.instances.get(event.instanceId);

        if (!metrics) {
            metrics = this.createEmptyInstanceMetrics(event.instanceId);
            this.metricsCache.instances.set(event.instanceId, metrics);
        }

        // Update counters
        switch (event.status) {
            case 'sent':
                metrics.totalSent++;
                break;
            case 'delivered':
            case 'read':
                metrics.totalDelivered++;
                break;
            case 'failed':
                metrics.totalFailed++;
                break;
            case 'blocked':
                metrics.totalBlocked++;
                break;
        }

        // Update rates
        if (metrics.totalSent > 0) {
            metrics.deliveryRate = (metrics.totalDelivered / metrics.totalSent) * 100;
            metrics.failureRate = (metrics.totalFailed / metrics.totalSent) * 100;
            metrics.blockRate = (metrics.totalBlocked / metrics.totalSent) * 100;
        }

        // Update latency
        if (event.durationMs) {
            const totalDuration = metrics.averageDeliveryTimeMs * (metrics.totalSent - 1) + event.durationMs;
            metrics.averageDeliveryTimeMs = totalDuration / metrics.totalSent;
        }

        // Update timestamp
        metrics.lastActivityAt = event.timestamp;

        // Recalculate health score
        metrics.healthScore = this.calculateHealthScore(event.instanceId);

        // Record health for trends
        this.recordHealthPoint(event.instanceId, metrics.healthScore);

        // Update trend
        metrics.trend = this.calculateTrend(event.instanceId);
    }

    private updateCampaignMetrics(event: MessageEvent): void {
        if (!event.campaignId) return;

        let metrics = this.metricsCache.campaigns.get(event.campaignId);

        if (!metrics) {
            metrics = this.createEmptyCampaignMetrics(event.campaignId);
            this.metricsCache.campaigns.set(event.campaignId, metrics);
        }

        // Update counters
        switch (event.status) {
            case 'sent':
                metrics.sent++;
                break;
            case 'delivered':
                metrics.delivered++;
                break;
            case 'read':
                metrics.read++;
                break;
            case 'failed':
                metrics.failed++;
                break;
            case 'blocked':
                metrics.blocked++;
                break;
        }

        // Update stack distribution
        if (!metrics.stackDistribution[event.stack]) {
            metrics.stackDistribution[event.stack] = 0;
        }
        metrics.stackDistribution[event.stack]++;

        // Update progress
        if (metrics.totalContacts > 0) {
            metrics.progressPercent = ((metrics.sent + metrics.failed) / metrics.totalContacts) * 100;
        }

        // Update delivery rate
        if (metrics.sent > 0) {
            metrics.averageDeliveryRate = (metrics.delivered / metrics.sent) * 100;
        }
    }

    private updateStackMetrics(event: MessageEvent): void {
        let metrics = this.metricsCache.stacks.get(event.stack);

        if (!metrics) {
            metrics = this.createEmptyStackMetrics(event.stack);
            this.metricsCache.stacks.set(event.stack, metrics);
        }

        metrics.totalMessages++;

        // Update rates (simplified - would use sliding window in production)
        const stackEvents = this.eventStore.events.filter(e => e.stack === event.stack);
        const sent = stackEvents.filter(e => e.status === 'sent').length;
        const failed = stackEvents.filter(e => e.status === 'failed').length;
        const blocked = stackEvents.filter(e => e.status === 'blocked').length;
        const delivered = stackEvents.filter(e => e.status === 'delivered').length;

        if (sent > 0) {
            metrics.successRate = (delivered / sent) * 100;
            metrics.failureRate = (failed / sent) * 100;
            metrics.blockRate = (blocked / sent) * 100;
        }

        // Update latency
        const latencies = stackEvents
            .filter(e => e.durationMs !== undefined)
            .map(e => e.durationMs!);
        if (latencies.length > 0) {
            metrics.averageLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        }

        // Calculate peak hour
        const hourCounts: number[] = new Array(24).fill(0);
        stackEvents.forEach(e => {
            const hour = e.timestamp.getHours();
            hourCounts[hour]++;
        });
        metrics.peakHour = hourCounts.indexOf(Math.max(...hourCounts));

        // Last hour volume
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        metrics.lastHourVolume = stackEvents.filter(e => e.timestamp >= oneHourAgo).length;
    }

    // =========================================================================
    // PRIVATE METHODS - ANOMALY DETECTION
    // =========================================================================

    private detectAnomalies(event: MessageEvent): void {
        const metrics = this.metricsCache.instances.get(event.instanceId);
        if (!metrics || metrics.totalSent < this.thresholds.minEventsForAnalysis) {
            return;
        }

        // Check failure rate
        if (metrics.failureRate >= this.thresholds.failureRateCritical) {
            this.createAlert({
                type: 'spike_failures',
                severity: 'critical',
                message: `Taxa de falha crítica: ${metrics.failureRate.toFixed(1)}% para ${event.instanceId}`,
                instanceId: event.instanceId,
                metadata: { failureRate: metrics.failureRate },
            });
        } else if (metrics.failureRate >= this.thresholds.failureRateWarning) {
            this.createAlert({
                type: 'spike_failures',
                severity: 'warning',
                message: `Taxa de falha elevada: ${metrics.failureRate.toFixed(1)}% para ${event.instanceId}`,
                instanceId: event.instanceId,
                metadata: { failureRate: metrics.failureRate },
            });
        }

        // Check block rate
        if (metrics.blockRate >= this.thresholds.blockRateCritical) {
            this.createAlert({
                type: 'block_detected',
                severity: 'critical',
                message: `Taxa de bloqueio crítica: ${metrics.blockRate.toFixed(1)}% para ${event.instanceId}`,
                instanceId: event.instanceId,
                metadata: { blockRate: metrics.blockRate },
            });
        }

        // Check delivery drop
        const previousDeliveryRate = this.getPreviousDeliveryRate(event.instanceId);
        if (previousDeliveryRate !== null &&
            previousDeliveryRate - metrics.deliveryRate >= this.thresholds.deliveryDropPercent) {
            this.createAlert({
                type: 'delivery_drop',
                severity: 'warning',
                message: `Queda na taxa de entrega: ${previousDeliveryRate.toFixed(1)}% → ${metrics.deliveryRate.toFixed(1)}%`,
                instanceId: event.instanceId,
                metadata: {
                    previousRate: previousDeliveryRate,
                    currentRate: metrics.deliveryRate,
                },
            });
        }
    }

    private createAlert(params: Omit<AnomalyAlert, 'id' | 'detectedAt'>): void {
        // Avoid duplicate alerts (same type + instance within 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const isDuplicate = this.alerts.some(
            a =>
                a.type === params.type &&
                a.instanceId === params.instanceId &&
                a.detectedAt >= fiveMinutesAgo
        );

        if (isDuplicate) return;

        const alert: AnomalyAlert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...params,
            detectedAt: new Date(),
        };

        this.alerts.push(alert);

        // Trim old alerts
        if (this.alerts.length > this.maxAlerts) {
            this.alerts = this.alerts.slice(-this.maxAlerts);
        }

        this.logger.warn(`🚨 Alert [${alert.severity}]: ${alert.message}`);
    }

    // =========================================================================
    // PRIVATE METHODS - HEALTH TRENDS
    // =========================================================================

    private recordHealthPoint(instanceId: string, score: number): void {
        if (!this.healthHistory.has(instanceId)) {
            this.healthHistory.set(instanceId, []);
        }

        const history = this.healthHistory.get(instanceId)!;
        history.push({ timestamp: new Date(), score });

        // Keep only last 24 hours of history
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const filtered = history.filter(h => h.timestamp >= cutoff);
        this.healthHistory.set(instanceId, filtered);
    }

    private calculateTrend(instanceId: string): 'improving' | 'stable' | 'declining' | 'critical' {
        const history = this.healthHistory.get(instanceId);
        if (!history || history.length < 3) {
            return 'stable';
        }

        // Compare first half vs second half average
        const mid = Math.floor(history.length / 2);
        const firstHalf = history.slice(0, mid);
        const secondHalf = history.slice(mid);

        const firstAvg = firstHalf.reduce((sum, h) => sum + h.score, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, h) => sum + h.score, 0) / secondHalf.length;

        const diff = secondAvg - firstAvg;

        if (secondAvg < 30) return 'critical';
        if (diff > 10) return 'improving';
        if (diff < -10) return 'declining';
        return 'stable';
    }

    private calculateHealthTrends(): HealthTrend[] {
        const trends: HealthTrend[] = [];

        for (const [instanceId, history] of this.healthHistory.entries()) {
            if (history.length < 2) continue;

            const trend = {
                instanceId,
                timestamps: history.map(h => h.timestamp),
                scores: history.map(h => h.score),
                trend: this.calculateTrend(instanceId) === 'improving'
                    ? 'up' as const
                    : this.calculateTrend(instanceId) === 'declining'
                        ? 'down' as const
                        : 'stable' as const,
                prediction: this.predictHealthScore(instanceId),
            };

            trends.push(trend);
        }

        return trends;
    }

    private predictHealthScore(instanceId: string): number {
        const history = this.healthHistory.get(instanceId);
        if (!history || history.length < 2) {
            return 50;
        }

        // Simple linear regression for prediction
        const n = history.length;
        const xSum = (n * (n - 1)) / 2;
        const ySum = history.reduce((sum, h) => sum + h.score, 0);
        const xySum = history.reduce((sum, h, i) => sum + i * h.score, 0);
        const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;

        const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
        const intercept = (ySum - slope * xSum) / n;

        // Predict for next 24 data points
        const prediction = intercept + slope * (n + 24);

        return Math.max(0, Math.min(100, Math.round(prediction)));
    }

    private getPreviousDeliveryRate(instanceId: string): number | null {
        const history = this.healthHistory.get(instanceId);
        if (!history || history.length < 10) {
            return null;
        }

        // Use 10th oldest point as "previous"
        const previousMetrics = this.eventStore.events
            .filter(e => e.instanceId === instanceId)
            .slice(0, -10);

        if (previousMetrics.length === 0) return null;

        const sent = previousMetrics.filter(e => e.status === 'sent').length;
        const delivered = previousMetrics.filter(e => e.status === 'delivered').length;

        return sent > 0 ? (delivered / sent) * 100 : null;
    }

    // =========================================================================
    // PRIVATE METHODS - HELPERS
    // =========================================================================

    private calculateHourlyVolume(events: MessageEvent[]): Array<{ hour: number; count: number }> {
        const hourCounts: number[] = new Array(24).fill(0);

        events.forEach(e => {
            const hour = e.timestamp.getHours();
            hourCounts[hour]++;
        });

        return hourCounts.map((count, hour) => ({ hour, count }));
    }

    private createEmptyInstanceMetrics(instanceId: string): InstanceMetrics {
        return {
            instanceId,
            totalSent: 0,
            totalDelivered: 0,
            totalFailed: 0,
            totalBlocked: 0,
            deliveryRate: 0,
            failureRate: 0,
            blockRate: 0,
            averageDeliveryTimeMs: 0,
            lastActivityAt: new Date(),
            healthScore: 50,
            trend: 'stable',
        };
    }

    private createEmptyCampaignMetrics(campaignId: string): CampaignMetrics {
        return {
            campaignId,
            totalContacts: 0,
            sent: 0,
            delivered: 0,
            read: 0,
            failed: 0,
            blocked: 0,
            progressPercent: 0,
            estimatedCompletionTime: null,
            averageDeliveryRate: 0,
            stackDistribution: {
                wwebjs: 0,
                waha: 0,
                evolution: 0,
                official: 0,
            },
        };
    }

    private createEmptyStackMetrics(stack: StackType): StackMetrics {
        return {
            stack,
            totalMessages: 0,
            successRate: 0,
            failureRate: 0,
            blockRate: 0,
            averageLatencyMs: 0,
            peakHour: 12,
            lastHourVolume: 0,
        };
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Export metrics for Prometheus/Grafana
     */
    exportPrometheusMetrics(): string {
        const lines: string[] = [];
        const allInstances = this.getAllInstanceMetrics();

        // Instance metrics
        for (const instance of allInstances) {
            lines.push(`whatsaas_instance_sent_total{instance="${instance.instanceId}"} ${instance.totalSent}`);
            lines.push(`whatsaas_instance_delivered_total{instance="${instance.instanceId}"} ${instance.totalDelivered}`);
            lines.push(`whatsaas_instance_failed_total{instance="${instance.instanceId}"} ${instance.totalFailed}`);
            lines.push(`whatsaas_instance_blocked_total{instance="${instance.instanceId}"} ${instance.totalBlocked}`);
            lines.push(`whatsaas_instance_health_score{instance="${instance.instanceId}"} ${instance.healthScore}`);
            lines.push(`whatsaas_instance_delivery_rate{instance="${instance.instanceId}"} ${instance.deliveryRate}`);
        }

        // Stack metrics
        for (const stack of this.metricsCache.stacks.values()) {
            lines.push(`whatsaas_stack_messages_total{stack="${stack.stack}"} ${stack.totalMessages}`);
            lines.push(`whatsaas_stack_success_rate{stack="${stack.stack}"} ${stack.successRate}`);
            lines.push(`whatsaas_stack_latency_ms{stack="${stack.stack}"} ${stack.averageLatencyMs}`);
        }

        // Alerts count
        const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;
        const warningAlerts = this.alerts.filter(a => a.severity === 'warning').length;
        lines.push(`whatsaas_alerts_total{severity="critical"} ${criticalAlerts}`);
        lines.push(`whatsaas_alerts_total{severity="warning"} ${warningAlerts}`);

        return lines.join('\n');
    }

    /**
     * Clear all metrics (for testing)
     */
    clearMetrics(): void {
        this.eventStore.events = [];
        this.metricsCache.instances.clear();
        this.metricsCache.campaigns.clear();
        this.metricsCache.stacks.clear();
        this.alerts = [];
        this.healthHistory.clear();
        this.logger.log('All metrics cleared');
    }
}
