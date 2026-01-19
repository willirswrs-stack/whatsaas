'use client';

import { Header } from '@/components';

// Mock analytics data
const stats = {
    totalSent: 45678,
    totalDelivered: 43210,
    totalRead: 38765,
    totalFailed: 2468,
    deliveryRate: 94.6,
    readRate: 89.7,
    avgResponseTime: '2.3 min',
};

const dailyStats = [
    { date: '10/01', sent: 1200, delivered: 1150, read: 980 },
    { date: '11/01', sent: 1450, delivered: 1380, read: 1200 },
    { date: '12/01', sent: 980, delivered: 920, read: 850 },
    { date: '13/01', sent: 1680, delivered: 1620, read: 1480 },
    { date: '14/01', sent: 2100, delivered: 2050, read: 1890 },
    { date: '15/01', sent: 1890, delivered: 1820, read: 1650 },
    { date: '16/01', sent: 1560, delivered: 1490, read: 1320 },
];

const topCampaigns = [
    { name: 'Black Friday 2024', sent: 12500, delivered: 12100, read: 10800, rate: 89.2 },
    { name: 'Lançamento Produto X', sent: 8900, delivered: 8650, read: 7890, rate: 91.2 },
    { name: 'Reativação Clientes', sent: 5600, delivered: 5200, read: 4100, rate: 78.8 },
    { name: 'Newsletter Janeiro', sent: 4200, delivered: 4050, read: 3600, rate: 88.8 },
];

const hourlyDistribution = [
    { hour: '08h', value: 5 },
    { hour: '09h', value: 15 },
    { hour: '10h', value: 25 },
    { hour: '11h', value: 35 },
    { hour: '12h', value: 20 },
    { hour: '13h', value: 10 },
    { hour: '14h', value: 30 },
    { hour: '15h', value: 45 },
    { hour: '16h', value: 40 },
    { hour: '17h', value: 35 },
    { hour: '18h', value: 25 },
    { hour: '19h', value: 15 },
];

export default function AnalyticsPage() {
    const maxDaily = Math.max(...dailyStats.map(d => d.sent));
    const maxHourly = Math.max(...hourlyDistribution.map(h => h.value));

    return (
        <div className="animate-fadeIn">
            <Header />

            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="page-title">Analytics</h1>
                    <p className="text-[var(--text-muted)]">
                        Métricas detalhadas de suas campanhas
                    </p>
                </div>
                <div className="flex gap-3">
                    <select className="input">
                        <option>Últimos 7 dias</option>
                        <option>Últimos 30 dias</option>
                        <option>Este mês</option>
                        <option>Mês anterior</option>
                    </select>
                    <button className="btn btn-secondary">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Exportar
                    </button>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <span className="stat-label">Mensagens Enviadas</span>
                        <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </div>
                    </div>
                    <span className="stat-value">{stats.totalSent.toLocaleString()}</span>
                    <span className="stat-change positive">+12.5% vs período anterior</span>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <span className="stat-label">Taxa de Entrega</span>
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <span className="stat-value">{stats.deliveryRate}%</span>
                    <span className="stat-change positive">+2.3%</span>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <span className="stat-label">Taxa de Leitura</span>
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                    </div>
                    <span className="stat-value">{stats.readRate}%</span>
                    <span className="stat-change positive">+5.1%</span>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <span className="stat-label">Falhas</span>
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <span className="stat-value">{stats.totalFailed.toLocaleString()}</span>
                    <span className="stat-change negative">-1.2%</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Daily Chart */}
                <div className="lg:col-span-2 glass p-6 rounded-xl">
                    <h3 className="font-semibold text-white mb-6">Mensagens por Dia</h3>
                    <div className="flex items-end gap-4 h-48">
                        {dailyStats.map((day, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full flex gap-1 items-end justify-center" style={{ height: '150px' }}>
                                    {/* Enviadas - Verde translúcido com glow */}
                                    <div
                                        className="flex-1 rounded-t"
                                        style={{
                                            height: `${(day.sent / maxDaily) * 150}px`,
                                            background: 'linear-gradient(180deg, rgba(74, 222, 128, 0.6) 0%, rgba(34, 197, 94, 0.4) 100%)',
                                            boxShadow: '0 0 15px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                            border: '1px solid rgba(74, 222, 128, 0.3)'
                                        }}
                                        title={`Enviadas: ${day.sent}`}
                                    />
                                    {/* Entregues - Amarelo translúcido com glow */}
                                    <div
                                        className="flex-1 rounded-t"
                                        style={{
                                            height: `${(day.delivered / maxDaily) * 150}px`,
                                            background: 'linear-gradient(180deg, rgba(253, 224, 71, 0.6) 0%, rgba(234, 179, 8, 0.4) 100%)',
                                            boxShadow: '0 0 15px rgba(234, 179, 8, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                            border: '1px solid rgba(253, 224, 71, 0.3)'
                                        }}
                                        title={`Entregues: ${day.delivered}`}
                                    />
                                    {/* Lidas - Vermelho translúcido com glow */}
                                    <div
                                        className="flex-1 rounded-t"
                                        style={{
                                            height: `${(day.read / maxDaily) * 150}px`,
                                            background: 'linear-gradient(180deg, rgba(248, 113, 113, 0.6) 0%, rgba(239, 68, 68, 0.4) 100%)',
                                            boxShadow: '0 0 15px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                            border: '1px solid rgba(248, 113, 113, 0.3)'
                                        }}
                                        title={`Lidas: ${day.read}`}
                                    />
                                </div>
                                <span className="text-xs text-[var(--text-muted)]">{day.date}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ background: 'rgba(74, 222, 128, 0.6)', boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)' }} />
                            <span className="text-sm text-[var(--text-muted)]">Enviadas</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ background: 'rgba(253, 224, 71, 0.6)', boxShadow: '0 0 8px rgba(234, 179, 8, 0.5)' }} />
                            <span className="text-sm text-[var(--text-muted)]">Entregues</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ background: 'rgba(248, 113, 113, 0.6)', boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)' }} />
                            <span className="text-sm text-[var(--text-muted)]">Lidas</span>
                        </div>
                    </div>
                </div>

                {/* Hourly Distribution */}
                <div className="glass p-6 rounded-xl">
                    <h3 className="font-semibold text-white mb-6">Melhor Horário</h3>
                    <div className="space-y-3">
                        {hourlyDistribution.map((item, index) => (
                            <div key={index} className="flex items-center gap-3">
                                <span className="text-xs text-[var(--text-muted)] w-8">{item.hour}</span>
                                <div className="flex-1 h-4 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${(item.value / maxHourly) * 100}%`,
                                            background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.5) 0%, rgba(99, 102, 241, 0.4) 100%)',
                                            boxShadow: '0 0 12px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                                            border: '1px solid rgba(168, 85, 247, 0.3)'
                                        }}
                                    />
                                </div>
                                <span className="text-xs text-[var(--text-muted)] w-8">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-3 glass rounded-lg">
                        <p className="text-sm text-center">
                            <span className="text-[var(--primary)] font-semibold">15h-16h</span>
                            <span className="text-[var(--text-muted)]"> é o melhor horário</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Top Campaigns */}
            <div className="glass p-6 rounded-xl">
                <h3 className="font-semibold text-white mb-6">Top Campanhas</h3>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--border-subtle)]">
                            <th className="text-left p-3 text-sm font-medium text-[var(--text-muted)]">Campanha</th>
                            <th className="text-right p-3 text-sm font-medium text-[var(--text-muted)]">Enviadas</th>
                            <th className="text-right p-3 text-sm font-medium text-[var(--text-muted)]">Entregues</th>
                            <th className="text-right p-3 text-sm font-medium text-[var(--text-muted)]">Lidas</th>
                            <th className="text-right p-3 text-sm font-medium text-[var(--text-muted)]">Taxa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topCampaigns.map((campaign, index) => (
                            <tr key={index} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]/50">
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="font-medium text-white">{campaign.name}</span>
                                    </div>
                                </td>
                                <td className="text-right p-3 text-[var(--text-secondary)]">{campaign.sent.toLocaleString()}</td>
                                <td className="text-right p-3 text-[var(--text-secondary)]">{campaign.delivered.toLocaleString()}</td>
                                <td className="text-right p-3 text-[var(--text-secondary)]">{campaign.read.toLocaleString()}</td>
                                <td className="text-right p-3">
                                    <span className={`px-2 py-1 rounded text-xs ${campaign.rate >= 90 ? 'bg-green-500/20 text-green-400' :
                                        campaign.rate >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                        {campaign.rate}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
