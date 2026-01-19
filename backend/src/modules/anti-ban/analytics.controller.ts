/**
 * Anti-Ban Analytics Controller
 * 
 * REST API for accessing anti-ban metrics and observability data.
 * Used by dashboards, monitoring tools, and admin interfaces.
 */

import {
    Controller,
    Get,
    Post,
    Query,
    Param,
    UseGuards,
    Header,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AntiBanAnalyticsService, AnomalyAlert, DashboardData, InstanceMetrics, StackMetrics, CampaignMetrics } from './analytics.service';
import { StackRouterService, StackType, StackCapabilities } from './stack-router.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(
        private readonly analytics: AntiBanAnalyticsService,
        private readonly stackRouter: StackRouterService,
    ) { }

    // =========================================================================
    // DASHBOARD
    // =========================================================================

    /**
     * Get complete dashboard data
     */
    @Get('dashboard')
    getDashboard() {
        return this.analytics.getDashboardData();
    }

    // =========================================================================
    // INSTANCE METRICS
    // =========================================================================

    /**
     * Get all instance metrics
     */
    @Get('instances')
    getAllInstanceMetrics(): InstanceMetrics[] {
        return this.analytics.getAllInstanceMetrics();
    }

    /**
     * Get metrics for a specific instance
     */
    @Get('instances/:instanceId')
    getInstanceMetrics(@Param('instanceId') instanceId: string): InstanceMetrics | null {
        return this.analytics.getInstanceMetrics(instanceId);
    }

    /**
     * Calculate health score for an instance
     */
    @Get('instances/:instanceId/health')
    getInstanceHealth(@Param('instanceId') instanceId: string): { instanceId: string; healthScore: number } {
        const score = this.analytics.calculateHealthScore(instanceId);
        return { instanceId, healthScore: score };
    }

    // =========================================================================
    // CAMPAIGN METRICS
    // =========================================================================

    /**
     * Get metrics for a specific campaign
     */
    @Get('campaigns/:campaignId')
    getCampaignMetrics(@Param('campaignId') campaignId: string): CampaignMetrics | null {
        return this.analytics.getCampaignMetrics(campaignId);
    }

    // =========================================================================
    // STACK PERFORMANCE
    // =========================================================================

    /**
     * Get all stack metrics
     */
    @Get('stacks')
    getAllStackMetrics(): StackMetrics[] {
        return this.analytics.getStackMetrics() as StackMetrics[];
    }

    /**
     * Get metrics for a specific stack
     */
    @Get('stacks/:stack')
    getStackMetrics(@Param('stack') stack: string) {
        return this.analytics.getStackMetrics(stack as StackType) as StackMetrics;
    }

    /**
     * Get success rates by stack for a time window
     */
    @Get('stacks/success-rates')
    getStackSuccessRates(
        @Query('hours') hours?: string
    ): Record<StackType, { sent: number; success: number; rate: number }> {
        const windowHours = hours ? parseInt(hours, 10) : 24;
        return this.analytics.getStackSuccessRates(windowHours);
    }

    /**
     * Get stack capabilities comparison
     */
    @Get('stacks/capabilities')
    getStackCapabilities(): Record<StackType, StackCapabilities> {
        return this.stackRouter.getAllStackCapabilities();
    }

    // =========================================================================
    // ALERTS
    // =========================================================================

    /**
     * Get recent alerts
     */
    @Get('alerts')
    getAlerts(
        @Query('severity') severity?: 'info' | 'warning' | 'critical',
        @Query('instanceId') instanceId?: string,
        @Query('limit') limit?: string
    ): AnomalyAlert[] {
        return this.analytics.getAlerts({
            severity,
            instanceId,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    /**
     * Get critical alerts only
     */
    @Get('alerts/critical')
    getCriticalAlerts(): AnomalyAlert[] {
        return this.analytics.getAlerts({ severity: 'critical', limit: 50 });
    }

    // =========================================================================
    // PROMETHEUS / MONITORING
    // =========================================================================

    /**
     * Export metrics in Prometheus format
     */
    @Get('metrics/prometheus')
    @Header('Content-Type', 'text/plain')
    getPrometheusMetrics(): string {
        return this.analytics.exportPrometheusMetrics();
    }

    // =========================================================================
    // STACK ROUTER RECOMMENDATIONS
    // =========================================================================

    /**
     * Get stack recommendation for a scenario
     */
    @Get('router/recommend')
    getStackRecommendation(
        @Query('chipAge') chipAge: 'new' | 'young' | 'mature' | 'veteran',
        @Query('health') health: 'critical' | 'poor' | 'moderate' | 'good' | 'excellent',
        @Query('campaignSize') campaignSize: 'small' | 'medium' | 'large' | 'massive',
        @Query('riskTolerance') riskTolerance: 'conservative' | 'balanced' | 'aggressive'
    ): { stack: StackType; confidence: number; notes: string[] } {
        return this.stackRouter.recommendForScenario({
            chipAge: chipAge || 'mature',
            health: health || 'good',
            campaignSize: campaignSize || 'medium',
            riskTolerance: riskTolerance || 'balanced',
        });
    }

    // =========================================================================
    // ADMIN ACTIONS
    // =========================================================================

    /**
     * Clear all metrics (admin only - for testing)
     */
    @Post('admin/clear')
    @HttpCode(HttpStatus.NO_CONTENT)
    clearMetrics(): void {
        // TODO: Add admin role check
        this.analytics.clearMetrics();
    }
}
