'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { antibanService, DashboardData } from '@/services/antiban.service';

export default function AnalyticsPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
        const interval = setInterval(loadDashboard, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboard = async () => {
        try {
            const dashboardData = await antibanService.getDashboardData();
            setData(dashboardData);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
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

    const safeData = data || {
        overview: {
            totalMessagesSent24h: 0,
            overallDeliveryRate: 0,
            activeInstances: 0,
            activeCampaigns: 0,
            healthyChips: 0,
            atRiskChips: 0,
        },
        hourlyVolume: Array.from({ length: 12 }, (_, i) => ({ hour: i + 8, count: 0 })),
        stackPerformance: [],
        topInstances: [],
        recentAlerts: [],
        healthTrends: [],
    };

    const maxHourly = Math.max(...(safeData.hourlyVolume?.map(h => h.count) || [1]), 1);

    const formatHour = (h: number) => `${h.toString().padStart(2, '0')}h`;

    return (
        <div className="animate-fadeIn pb-12">
            <Header />

            <div className="flex items-center justify-between mb-8 mt-6 container mx-auto px-4 max-w-7xl">
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/analytics.png" alt="Analytics" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics & Monitoramento</h1>
                        <p className="text-sm text-[var(--text-muted)]">
                            Métricas detalhadas e reais do sistema (Dados ao vivo)
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-7xl">
                {/* Main Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="stat-card glass-card p-5">
                        <div className="flex items-center justify-between">
                            <span className="stat-label text-[var(--text-muted)] text-sm">Mensagens Enviadas (24h)</span>
                            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </div>
                        </div>
                        <span className="text-2xl font-bold">{safeData.overview.totalMessagesSent24h.toLocaleString()}</span>
                    </div>

                    <div className="stat-card glass-card p-5">
                        <div className="flex items-center justify-between">
                            <span className="stat-label text-[var(--text-muted)] text-sm">Taxa de Entrega</span>
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <span className="text-2xl font-bold">{safeData.overview.overallDeliveryRate.toFixed(1)}%</span>
                    </div>

                    <div className="stat-card glass-card p-5">
                        <div className="flex items-center justify-between">
                            <span className="stat-label text-[var(--text-muted)] text-sm">Instâncias Ativas</span>
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <span className="text-2xl font-bold">{safeData.overview.activeInstances}</span>
                    </div>

                    <div className="stat-card glass-card p-5">
                        <div className="flex items-center justify-between">
                            <span className="stat-label text-[var(--text-muted)] text-sm">Chips Saudáveis</span>
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold">{safeData.overview.healthyChips}</span>
                            <span className="text-xs text-yellow-500">{safeData.overview.atRiskChips} em risco</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Hourly Distribution */}
                    <div className="glass-card p-6">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Volume de Disparos por Hora
                        </h3>
                        <div className="space-y-3">
                            {safeData.hourlyVolume?.length > 0 ? safeData.hourlyVolume.slice(-12).map((item, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <span className="text-xs text-[var(--text-muted)] w-8">{formatHour(item.hour)}</span>
                                    <div className="flex-1 h-4 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${(item.count / maxHourly) * 100}%`,
                                                background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.5) 0%, rgba(99, 102, 241, 0.4) 100%)',
                                                boxShadow: '0 0 12px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                                            }}
                                            title={`${item.count} mensagens`}
                                        />
                                    </div>
                                    <span className="text-xs text-[var(--text-muted)] w-8 text-right">{item.count}</span>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-[var(--text-muted)]">Nenhum dado volume disponível.</div>
                            )}
                        </div>
                    </div>

                    {/* Top Instances */}
                    <div className="glass-card p-6">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Top Instâncias (Emissores)
                        </h3>
                        {safeData.topInstances && safeData.topInstances.length > 0 ? (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--border-subtle)]">
                                        <th className="text-left p-3 text-sm font-medium text-[var(--text-muted)]">Instância</th>
                                        <th className="text-right p-3 text-sm font-medium text-[var(--text-muted)]">Enviadas</th>
                                        <th className="text-right p-3 text-sm font-medium text-[var(--text-muted)]">Tx. Entrega</th>
                                        <th className="text-right p-3 text-sm font-medium text-[var(--text-muted)]">Saúde</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeData.topInstances.map((instance, index) => (
                                        <tr key={index} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]/50">
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                                                        {index + 1}
                                                    </span>
                                                    <span className="font-medium text-white">{instance.instanceId}</span>
                                                </div>
                                            </td>
                                            <td className="text-right p-3 text-[var(--text-secondary)]">{instance.totalSent.toLocaleString()}</td>
                                            <td className="text-right p-3">
                                                <span className={`px-2 py-1 rounded text-xs ${instance.deliveryRate >= 90 ? 'bg-green-500/20 text-green-400' :
                                                    instance.deliveryRate >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {instance.deliveryRate.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="text-right p-3">
                                                <span className={`font-bold ${instance.healthScore >= 80 ? 'text-green-500' : instance.healthScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                    {instance.healthScore} / 100
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                                Nenhuma instância enviou mensagens ainda ou os dados foram apagados. Envie uma campanha para popular.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
