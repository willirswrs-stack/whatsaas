'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { antibanService, DashboardData } from '@/services/antiban.service';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
    Activity, Send, CheckCircle, Database, AlertTriangle, 
    TrendingUp, Zap, Clock, Shield, BarChart3, Users
} from 'lucide-react';

export default function AnalyticsPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'24h' | '7d' | '30d'>('24h');

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
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)] animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-[var(--primary)] animate-pulse" />
                    </div>
                </div>
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

    // Prepare data for the volume chart
    const chartData = safeData.hourlyVolume?.map(h => ({
        name: `${h.hour}h`,
        vol: h.count
    })) || [];

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen pb-12 bg-[var(--bg-primary)]">
            <Header />

            <div className="container mx-auto px-6 max-w-7xl pt-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold text-white tracking-tight">Analytics & Insights</h1>
                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    Live
                                </span>
                            </div>
                            <p className="text-[var(--text-muted)] text-sm">Monitoramento em tempo real de campanhas e chips</p>
                        </div>
                    </motion.div>

                    <div className="flex bg-[var(--bg-tertiary)]/50 p-1 rounded-xl border border-[var(--border-subtle)]">
                        {(['24h', '7d', '30d'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === tab 
                                    ? 'bg-[var(--primary)] text-white shadow-lg' 
                                    : 'text-[var(--text-muted)] hover:text-white'
                                }`}
                            >
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary Stats Grid */}
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
                >
                    <motion.div variants={itemVariants} className="stat-card group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="stat-label">Total Enviado (24h)</span>
                            <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                                <Send size={18} />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="stat-value">{safeData.overview.totalMessagesSent24h.toLocaleString()}</span>
                            <div className="flex items-center text-green-400 text-xs font-medium bg-green-400/10 px-2 py-1 rounded-md">
                                <TrendingUp size={12} className="mr-1" />
                                +12%
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="stat-card group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="stat-label">Taxa de Entrega</span>
                            <div className="p-2 rounded-lg bg-green-500/10 text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all">
                                <CheckCircle size={18} />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="stat-value">{safeData.overview.overallDeliveryRate.toFixed(1)}%</span>
                            <div className="w-16 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mt-2">
                                <div 
                                    className="h-full bg-green-400 transition-all duration-1000" 
                                    style={{ width: `${safeData.overview.overallDeliveryRate}%` }}
                                ></div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="stat-card group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="stat-label">Instâncias Ativas</span>
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                <Database size={18} />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="stat-value">{safeData.overview.activeInstances}</span>
                            <span className="text-[var(--text-muted)] text-[10px] font-medium">Capacidade: 95%</span>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="stat-card group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="stat-label">Saúde dos Chips</span>
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                <Shield size={18} />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="flex flex-col">
                                <span className="stat-value">{safeData.overview.healthyChips}</span>
                                <span className="text-xs text-yellow-500/80 font-medium">{safeData.overview.atRiskChips} em monitoramento</span>
                            </div>
                            <Activity size={24} className="text-indigo-400 opacity-30" />
                        </div>
                    </motion.div>
                </motion.div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-2 glass-card p-8 flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Zap size={20} className="text-[var(--primary)]" />
                                    Volume de Envios
                                </h3>
                                <p className="text-xs text-[var(--text-muted)]">Distribuição horária de disparos efetuados</p>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>
                                    Atual
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(18, 13, 31, 0.9)', 
                                            borderRadius: '12px', 
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            backdropFilter: 'blur(10px)',
                                            color: '#fff'
                                        }}
                                        itemStyle={{ color: 'var(--primary)' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="vol" 
                                        stroke="var(--primary)" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorVol)" 
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="glass-card p-8"
                    >
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Shield size={20} className="text-green-400" />
                            Saúde do Sistema
                        </h3>
                        
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[var(--text-secondary)]">Disponibilidade</span>
                                    <span className="text-white font-bold">99.9%</span>
                                </div>
                                <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: '99.9%' }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,150,0.4)]"
                                    ></motion.div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[var(--text-secondary)]">Taxa Anti-Ban</span>
                                    <span className="text-white font-bold">94.2%</span>
                                </div>
                                <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: '94.2%' }}
                                        transition={{ duration: 1, delay: 0.6 }}
                                        className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                                    ></motion.div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[var(--text-secondary)]">Uso da API Meta</span>
                                    <span className="text-white font-bold">12k / 50k</span>
                                </div>
                                <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: '24%' }}
                                        transition={{ duration: 1, delay: 0.7 }}
                                        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                                    ></motion.div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-orange-400 w-5 h-5 flex-shrink-0" />
                                <div>
                                    <span className="block text-xs font-bold text-orange-400 uppercase mb-1">Ação Recomendada</span>
                                    <p className="text-[10px] text-orange-200/70 leading-relaxed">
                                        Detectamos aumento no delay médio da stack Evolution. Considere rotacionar chips em cooldown.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Bottom Section: Top Instances & Recent Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Top Instances */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="lg:col-span-2 glass-card p-0 overflow-hidden"
                    >
                        <div className="px-8 pt-8 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users size={20} className="text-blue-400" />
                                Desempenho por Instância
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-black/20">
                                    <tr>
                                        <th className="px-8 py-4 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Instância</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Mensagens</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Entrega</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {safeData.topInstances && safeData.topInstances.length > 0 ? (
                                        safeData.topInstances.map((inst, i) => (
                                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-white">
                                                            {i + 1}
                                                        </div>
                                                        <span className="font-semibold text-white text-sm">{inst.instanceId}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-medium text-[var(--text-secondary)]">
                                                    {inst.totalSent.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <span className={`text-xs font-bold ${inst.deliveryRate >= 90 ? 'text-green-400' : 'text-orange-400'}`}>
                                                            {inst.deliveryRate.toFixed(1)}%
                                                        </span>
                                                        <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full ${inst.deliveryRate >= 90 ? 'bg-green-400' : 'bg-orange-400'}`}
                                                                style={{ width: `${inst.deliveryRate}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                                                        inst.healthScore >= 80 ? 'bg-green-500/10 text-green-400' : 
                                                        inst.healthScore >= 50 ? 'bg-orange-500/10 text-orange-400' : 
                                                        'bg-red-500/10 text-red-400'
                                                    }`}>
                                                        {inst.healthScore >= 80 ? 'Optimal' : inst.healthScore >= 50 ? 'Warning' : 'Critical'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-12 text-center text-[var(--text-muted)] text-sm italic">
                                                Nenhum dado de instância disponível no momento.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    {/* Recent Alerts Feed */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="glass-card flex flex-col"
                    >
                        <div className="p-8 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity size={20} className="text-red-400" />
                                Alertas Recentes
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 max-h-[400px]">
                            {safeData.recentAlerts && safeData.recentAlerts.length > 0 ? (
                                safeData.recentAlerts.map((alert, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                                alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 
                                                alert.severity === 'warning' ? 'bg-orange-500/20 text-orange-400' : 
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {alert.severity}
                                            </span>
                                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                                <Clock size={10} />
                                                {new Date(alert.detectedAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                                            {alert.message}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-50 py-10">
                                    <CheckCircle size={40} className="text-green-500 mb-2" />
                                    <p className="text-sm">Tudo limpo!</p>
                                    <p className="text-[10px]">Sem alertas críticos</p>
                                </div>
                            )}
                        </div>

                        <button className="m-6 mt-0 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[var(--text-secondary)] transition-colors border border-white/5">
                            Ver Histórico Completo
                        </button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
