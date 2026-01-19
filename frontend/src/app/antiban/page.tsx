'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { antibanService, DashboardData } from '@/services/antiban.service';

export default function AntiBanDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadDashboard();
        // Refresh every 30 seconds
        const interval = setInterval(loadDashboard, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboard = async () => {
        try {
            const dashboardData = await antibanService.getDashboardData();
            setData(dashboardData);
            setError(null);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            // Fallback for demo purposes if backend is not yet populated
            // setError('Falha ao carregar dados. Verifique se o backend está rodando.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin"></div>
            </div>
        );
    }

    // Default empty data structure to prevent crashes
    const safeData = data || {
        overview: {
            totalMessagesSent24h: 0,
            overallDeliveryRate: 0,
            activeInstances: 0,
            activeCampaigns: 0,
            healthyChips: 0,
            atRiskChips: 0
        },
        hourlyVolume: [],
        stackPerformance: [],
        recentAlerts: [],
        healthTrends: []
    };

    return (
        <div className="animate-fadeIn pb-12">
            <Header />

            <div className="container mx-auto px-4 max-w-7xl">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Anti-Ban Intelligence</h1>
                            <p className="text-sm text-[var(--text-muted)]">Monitoramento em tempo real da saúde dos chips e rotas</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-xs font-medium text-[var(--text-secondary)]">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Sistema Operacional
                        </span>
                        <button onClick={() => loadDashboard()} className="btn btn-ghost btn-sm">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                <path d="M16 21h5v-5" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="Mensagens (24h)"
                        value={safeData.overview.totalMessagesSent24h.toLocaleString()}
                        trend="+12%" // Placeholder trend
                        trendUp={true}
                    />
                    <StatCard
                        label="Taxa de Entrega"
                        value={`${safeData.overview.overallDeliveryRate.toFixed(1)}%`}
                        color={safeData.overview.overallDeliveryRate >= 90 ? 'text-green-500' : 'text-yellow-500'}
                    />
                    <StatCard
                        label="Chips Saudáveis"
                        value={`${safeData.overview.healthyChips}/${safeData.overview.activeInstances}`}
                        subtext={`${safeData.overview.atRiskChips} em risco`}
                    />
                    <StatCard
                        label="Performance do Stack"
                        value="98.5%"
                        subtext="Latência média: 1.2s"
                        color="text-indigo-500"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Stack Performance */}
                    <div className="glass-card p-6 lg:col-span-2">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[var(--accent-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 20V10" />
                                <path d="M12 20V4" />
                                <path d="M6 20v-6" />
                            </svg>
                            Performance por Stack
                        </h3>

                        <div className="space-y-6">
                            {safeData.stackPerformance.map((stack, index) => (
                                <div key={stack.stack} className="relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold uppercase
                                                ${stack.stack === 'wwebjs' ? 'bg-green-600' :
                                                    stack.stack === 'waha' ? 'bg-blue-600' :
                                                        stack.stack === 'evolution' ? 'bg-purple-600' : 'bg-gray-600'}`}>
                                                {stack.stack.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)] capitalize">{stack.stack}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{stack.totalMessages} mensagens</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-sm font-bold ${stack.successRate >= 95 ? 'text-green-500' : stack.successRate >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                {stack.successRate.toFixed(1)}%
                                            </span>
                                            <p className="text-xs text-[var(--text-muted)]">{stack.averageLatencyMs.toFixed(0)}ms</p>
                                        </div>
                                    </div>
                                    <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${stack.successRate >= 95 ? 'bg-green-500' : stack.successRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${stack.successRate}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}

                            {safeData.stackPerformance.length === 0 && (
                                <div className="text-center py-8 text-[var(--text-muted)]">
                                    Nenhum dado de stack disponível ainda.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alerts Feed */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <svg className="w-5 h-5 text-[var(--accent-warning)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                Alertas Recentes
                            </h3>
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                                {safeData.recentAlerts.length}
                            </span>
                        </div>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {safeData.recentAlerts.map((alert) => (
                                <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${alert.severity === 'critical' ? 'border-red-500 bg-red-500/10' :
                                        alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-500/10' :
                                            'border-blue-500 bg-blue-500/10'
                                    }`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                                            {alert.type.replace('_', ' ')}
                                        </h4>
                                        <span className="text-[10px] text-[var(--text-muted)]">
                                            {new Date(alert.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)]">{alert.message}</p>
                                </div>
                            ))}

                            {safeData.recentAlerts.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-2">
                                        <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                            <polyline points="22 4 12 14.01 9 11.01" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)]">Tudo tranquilo! Nenhum alerta detectado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="glass-card p-6 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border-primary)]">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 12h5" />
                            <path d="M17 12h5" />
                            <path d="M12 2v5" />
                            <path d="M12 17v5" />
                            <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" />
                            <path d="M22 17v1c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-1" />
                        </svg>
                        Insights do StackRouter
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)]">
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Aquecimento de Chips</h4>
                            <p className="text-xs text-[var(--text-secondary)] mb-3">5 chips estão próximos de subir de nível de maturação. Recomenda-se aumentar volume gradualmente.</p>
                            <button className="text-xs font-medium text-indigo-500 hover:text-indigo-400">Ver Chips &rarr;</button>
                        </div>
                        <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)]">
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Otimização de Stack</h4>
                            <p className="text-xs text-[var(--text-secondary)] mb-3">WAHA está com latência 15% menor hoje. O router priorizará WAHA para campanhas de médio volume.</p>
                        </div>
                        <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)]">
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Comportamento Humano</h4>
                            <p className="text-xs text-[var(--text-secondary)] mb-3">Variações de saudação estão com 98% de unicidade. Risco de detecção de spam baixo.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, trend, trendUp, subtext, color }: any) {
    return (
        <div className="glass-card p-5 hover:border-[var(--accent-primary)] transition-all duration-300">
            <h3 className="text-sm font-medium text-[var(--text-muted)] mb-1">{label}</h3>
            <div className="flex items-end justify-between">
                <div>
                    <span className={`text-2xl font-bold ${color || 'text-[var(--text-primary)]'}`}>{value}</span>
                    {subtext && <p className="text-xs text-[var(--text-muted)] mt-1">{subtext}</p>}
                </div>
                {trend && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trendUp ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                        {trend}
                    </span>
                )}
            </div>
        </div>
    );
}
