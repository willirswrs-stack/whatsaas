'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { adminService, AdminStats } from '@/lib/admin';

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [togglingFeature, setTogglingFeature] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(() => {
            fetchStats(false); // Silent refresh
        }, 20000);

        return () => clearInterval(interval);
    }, []);

    const fetchStats = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const data = await adminService.getStats();
            setStats(data);
        } catch (error) {
            console.error('Falha ao buscar stats admin', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleToggleFeature = async (featureName: string, currentStatus: boolean) => {
        try {
            setTogglingFeature(featureName);
            await adminService.toggleFeature(featureName, !currentStatus);
            
            // Update locally instantly for snappy UI
            if (stats) {
                setStats({
                    ...stats,
                    features: {
                        ...stats.features,
                        [featureName]: !currentStatus
                    }
                });
            }
        } catch (err) {
            alert('Erro ao alternar estado do recurso.');
        } finally {
            setTogglingFeature(null);
        }
    };

    // Helpers
    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
    };

    const memoryUsedPercent = stats 
        ? Math.round(((stats.server.memoryTotal - stats.server.memoryFree) / stats.server.memoryTotal) * 100) 
        : 0;

    const featureLabels: Record<string, { title: string, desc: string, icon: string }> = {
        voiceCloning: { title: 'Clonagem de Voz', desc: 'Geração de áudios via ElevenLabs', icon: '🗣️' },
        aiChatResponse: { title: 'IA Chat & Anti-Ban', desc: 'Respostas inteligentes OpenAI/Gemini', icon: '🤖' },
        proxyRotation: { title: 'Rotação de Proxies', desc: 'Rotacionar IPs em falhas de envio', icon: '🔄' },
        apiWebhooks: { title: 'Disparo de Webhooks', desc: 'Integração externa de eventos', icon: '🪝' },
        elevatedAntiBan: { title: 'Modo Anti-Ban Elevado', desc: 'Delay aleatório avançado habilitado', icon: '🛡️' },
    };

    return (
        <div className="animate-fadeIn space-y-8 p-6 relative text-white">
            <Header />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                        <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">🖥️</span> 
                        Painel de Controle Global
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Supervisão de telemetria física, consumo financeiro de APIs e saúde de tráfego.</p>
                </div>
                <div className="flex items-center gap-2 bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20">
                    <div className={`w-2.5 h-2.5 rounded-full bg-cyan-400 ${loading ? 'animate-pulse' : ''}`}></div>
                    <span className="text-xs text-cyan-300 font-mono tracking-wider uppercase">Telemetria Live</span>
                </div>
            </div>

            {/* 🚀 BLOCO 1: MÉTRICAS PRINCIPAIS (GRID EXPANDIDO) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                
                {/* Clientes */}
                <div className="glass-card p-5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                    <div className="absolute right-[-10px] top-[-10px] w-16 h-16 bg-indigo-500 opacity-5 blur-2xl rounded-full"></div>
                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-1">Clientes</p>
                    <h2 className="text-3xl font-black">{loading && !stats ? '...' : stats?.totalTenants}</h2>
                    <span className="text-[10px] text-gray-500">Workspaces ativos</span>
                </div>

                {/* Instâncias */}
                <div className="glass-card p-5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
                    <div className="absolute right-[-10px] top-[-10px] w-16 h-16 bg-amber-500 opacity-5 blur-2xl rounded-full"></div>
                    <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">WhatsApp On</p>
                    <h2 className="text-3xl font-black text-amber-300">
                        {loading && !stats ? '...' : `${stats?.instancesOnline}/${stats?.totalInstances}`}
                    </h2>
                    <span className="text-[10px] text-gray-500">Conectados / Total</span>
                </div>

                {/* Proxies */}
                <div className="glass-card p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <div className="absolute right-[-10px] top-[-10px] w-16 h-16 bg-emerald-500 opacity-5 blur-2xl rounded-full"></div>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">Proxies</p>
                    <h2 className="text-3xl font-black">{loading && !stats ? '...' : stats?.totalProxies}</h2>
                    <span className="text-[10px] text-gray-500">Na Pool de Rotação</span>
                </div>

                {/* Mensagens Trafegadas */}
                <div className="glass-card p-5 relative overflow-hidden group hover:border-pink-500/30 transition-all">
                    <div className="absolute right-[-10px] top-[-10px] w-16 h-16 bg-pink-500 opacity-5 blur-2xl rounded-full"></div>
                    <p className="text-xs text-pink-400 font-bold uppercase tracking-widest mb-1">Volume Total</p>
                    <h2 className="text-3xl font-black text-pink-400">{loading && !stats ? '...' : (stats?.totalMessagesTraffic || 0).toLocaleString('pt-BR')}</h2>
                    <span className="text-[10px] text-gray-500">Mensagens enviadas</span>
                </div>

                {/* OpenAI Tokens */}
                <div className="glass-card p-5 relative overflow-hidden group hover:border-teal-500/30 transition-all">
                    <div className="absolute right-[-10px] top-[-10px] w-16 h-16 bg-teal-500 opacity-5 blur-2xl rounded-full"></div>
                    <p className="text-xs text-teal-400 font-bold uppercase tracking-widest mb-1">Tokens de IA</p>
                    <h2 className="text-3xl font-black text-teal-400">{loading && !stats ? '...' : (stats?.aiTokensConsumed || 0).toLocaleString('pt-BR')}</h2>
                    <span className="text-[10px] text-gray-500">Processados hoje</span>
                </div>

                {/* Vozes Clonadas */}
                <div className="glass-card p-5 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
                    <div className="absolute right-[-10px] top-[-10px] w-16 h-16 bg-cyan-500 opacity-5 blur-2xl rounded-full"></div>
                    <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mb-1">Vozes Ativas</p>
                    <h2 className="text-3xl font-black">{loading && !stats ? '...' : stats?.clonedVoices}</h2>
                    <span className="text-[10px] text-gray-500">Registradas na Eleven</span>
                </div>

            </div>

            {/* 🛠️ BLOCO 2: TOGGLE DE RECURSOS GLOBAIS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Features Flags Panel */}
                <div className="lg:col-span-2 glass-card p-6 border-cyan-500/10 shadow-[0_0_30px_-10px_rgba(6,182,212,0.1)]">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <span>🎛️</span> Interruptores de Recursos Globais (Master Killswitches)
                        </h3>
                        <span className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">Super User Required</span>
                    </div>
                    
                    <div className="space-y-4">
                        {!stats ? (
                            <div className="py-10 text-center text-gray-500 animate-pulse">Carregando estados das chaves...</div>
                        ) : (
                            Object.entries(stats.features || {}).map(([key, value]) => {
                                const detail = featureLabels[key] || { title: key, desc: 'Recurso dinâmico detectado.', icon: '⚙️' };
                                const isWorking = togglingFeature === key;
                                return (
                                    <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl p-2 bg-white/5 rounded-lg">{detail.icon}</div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white">{detail.title}</h4>
                                                <p className="text-xs text-gray-500">{detail.desc}</p>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={() => handleToggleFeature(key, value)}
                                            disabled={isWorking}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                                                value ? 'bg-cyan-600' : 'bg-gray-700'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    value ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Proxy Rotation Health */}
                <div className="glass-card p-6 flex flex-col">
                    <h3 className="font-bold text-lg border-b border-white/5 pb-4 mb-5 flex items-center gap-2">
                        <span>📡</span> Auditor de Rotação de Proxies
                    </h3>

                    <div className="flex-1 flex flex-col items-center justify-center py-4">
                        <div className="relative w-36 h-36 rounded-full border-[8px] border-white/5 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-[8px] border-emerald-500 border-t-transparent border-l-transparent -rotate-45"></div>
                            <div className="text-center z-10">
                                <p className="text-3xl font-black text-emerald-400">{stats ? `${stats.proxyRotationHealth}%` : '...'}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Eficiência</p>
                            </div>
                        </div>

                        <div className="w-full mt-6 space-y-2 text-xs">
                            <div className="flex justify-between border-b border-white/5 py-2">
                                <span className="text-gray-500">Último Switch de IP</span>
                                <span className="text-white font-mono">Há 4 segundos</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 py-2">
                                <span className="text-gray-500">Proxies com Ban (24h)</span>
                                <span className="text-red-400 font-bold">0 detectados</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-500">Algoritmo Ativo</span>
                                <span className="text-cyan-400">Round Robin Dinâmico</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* 📊 BLOCO 3: SAÚDE DO SERVIDOR & QUICK LINKS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                        <h3 className="font-bold text-lg">Saúde Física do Node Central</h3>
                    </div>

                    {!stats ? (
                        <div className="py-10 text-center text-gray-500 animate-pulse">Carregando telemetria...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            
                            {/* Memory Gauge */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Uso de Memória RAM</span>
                                    <span className={`font-mono font-bold ${memoryUsedPercent > 80 ? 'text-red-400' : 'text-cyan-400'}`}>{memoryUsedPercent}%</span>
                                </div>
                                <div className="w-full h-3.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                            memoryUsedPercent > 85 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                                        }`} 
                                        style={{ width: `${memoryUsedPercent}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between mt-3 text-xs font-mono text-gray-500">
                                    <span>{Math.round((stats.server.memoryTotal - stats.server.memoryFree) / 1024)} GB</span>
                                    <span>{Math.round(stats.server.memoryTotal / 1024)} GB Máx</span>
                                </div>
                            </div>

                            {/* OS info */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-white/5">
                                    <span className="text-xs text-gray-400">SO / Núcleos</span>
                                    <span className="text-xs font-mono text-white uppercase">{stats.server.platform} ({stats.server.cpuCount} vCPUs)</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-white/5">
                                    <span className="text-xs text-gray-400">Uptime Contínuo</span>
                                    <span className="text-xs font-mono text-emerald-400">{formatUptime(stats.server.uptime)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Ops Links */}
                <div className="glass-card p-6 flex flex-col justify-between">
                    <h3 className="font-bold text-lg border-b border-white/5 pb-4 mb-4">Controle Operacional</h3>
                    
                    <div className="space-y-3">
                        <a 
                            href="/admin/logs" 
                            className="flex items-center justify-between p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10 hover:border-yellow-500/40 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center bg-yellow-500/20 rounded-full text-xl">📜</div>
                                <div>
                                    <p className="text-sm font-bold text-white">Console de Logs</p>
                                    <p className="text-[10px] text-gray-400">Debug em tempo real</p>
                                </div>
                            </div>
                            <span className="text-yellow-500 text-xl font-light">→</span>
                        </a>

                        <a 
                            href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/admin/queues`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center bg-red-500/20 rounded-full text-xl">⚙️</div>
                                <div>
                                    <p className="text-sm font-bold text-white">Gerenciar Filas</p>
                                    <p className="text-[10px] text-gray-400">BullMQ Dashboard</p>
                                </div>
                            </div>
                            <span className="text-red-500 text-xl font-light">→</span>
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
}
