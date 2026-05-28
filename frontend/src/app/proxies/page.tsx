'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import api from '@/lib/api';

// Lista inicial vazia - proxies serão adicionados pelo usuário
const proxies: { id: number; host: string; port: number; type: string; country: string; city: string; latency: number; status: string; chips: number }[] = [];

const getLatencyColor = (latency: number) => {
    if (latency === 0) return 'var(--text-muted)';
    if (latency < 50) return 'var(--accent-success)';
    if (latency < 100) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
};

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'online': return { color: 'var(--accent-success)', label: 'Online', bg: 'rgba(34, 197, 94, 0.15)' };
        case 'slow': return { color: 'var(--accent-warning)', label: 'Lento', bg: 'rgba(245, 158, 11, 0.15)' };
        case 'offline': return { color: 'var(--accent-danger)', label: 'Offline', bg: 'rgba(239, 68, 68, 0.15)' };
        default: return { color: 'var(--text-muted)', label: 'Desconhecido', bg: 'rgba(107, 101, 128, 0.15)' };
    }
};

export default function ProxiesPage() {
    const [showModal, setShowModal] = useState(false);
    const [proxyList, setProxyList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [newProxy, setNewProxy] = useState({ host: '', port: '1080', type: 'http', username: '', password: '' });
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ online: boolean, latencyMs?: number, error?: string } | null>(null);

    useEffect(() => {
        fetchProxies();
    }, []);

    const fetchProxies = async () => {
        try {
            setLoading(true);
            // Fetch manual proxies
            const resManual = await api.get('/instances/proxies');
            
            // Fetch purchased proxies
            let resPurchased = { data: [] };
            try {
                resPurchased = await api.get('/proxies');
            } catch (err) {
                console.warn('Endpoint /proxies ainda não respondeu, ignorando...', err);
            }
            
            // Format purchased proxies to match manual proxy schema for the table
            const formattedPurchased = resPurchased.data.map((p: any) => ({
                id: p.id,
                host: p.host,
                port: p.port,
                type: 'socks5',
                country: 'Móvel / ISP',
                city: p.provider,
                latencyMs: 15,
                status: p.status,
                instances: p.assignedInstanceId ? [p.assignedInstanceId] : []
            }));

            setProxyList([...(resManual.data || []), ...formattedPurchased]);
        } catch (e) {
            console.error('Erro ao carregar proxies', e);
        } finally {
            setLoading(false);
        }
    };

    const handleTestProxy = async () => {
        if (!newProxy.host || !newProxy.port) return;
        
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await api.post('/instances/proxies/test', {
                host: newProxy.host,
                port: Number(newProxy.port),
                type: newProxy.type,
                username: newProxy.username,
                password: newProxy.password
            });
            
            setTestResult(res.data);
        } catch (err) {
            setTestResult({ online: false, error: 'Erro de comunicação com o servidor.' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleAddProxy = async () => {
        if (!newProxy.host) return;
        try {
            await api.post('/instances/proxies', {
                host: newProxy.host,
                port: Number(newProxy.port),
                type: newProxy.type,
                username: newProxy.username,
                password: newProxy.password,
                status: testResult?.online ? 'online' : 'unknown',
                latencyMs: testResult?.latencyMs || 0
            });
            
            setNewProxy({ host: '', port: '1080', type: 'http', username: '', password: '' });
            setTestResult(null);
            setShowModal(false);
            fetchProxies();
        } catch (error) {
            alert('Falha ao salvar proxy no banco de dados.');
        }
    };

    const handleDeleteProxy = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este proxy?')) return;
        try {
            await api.delete(`/instances/proxies/${id}`);
            fetchProxies();
        } catch (e) {
            alert('Falha ao excluir proxy.');
        }
    };
    return (
        <div className="animate-fadeIn">
            <Header />

            <div className="page-header">
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/proxies.png" alt="Proxies" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="page-title">Gestão de Proxies</h1>
                        <p className="text-sm text-[var(--text-muted)]">Proxies residenciais ISP estáticos de alto desempenho são provisionados automaticamente para seus chips (WhatsApp não oficial) para proteção total contra bans.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Adicionar Manualmente
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="stat-card">
                    <span className="stat-label">Total Proxies</span>
                    <span className="stat-value">{proxyList.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Online</span>
                    <span className="stat-value text-[var(--accent-success)]">{proxyList.filter(p => p.status === 'online').length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Offline</span>
                    <span className="stat-value text-[var(--accent-danger)]">{proxyList.filter(p => p.status === 'offline').length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Latência Média</span>
                    <span className="stat-value">{proxyList.length > 0 ? Math.round(proxyList.reduce((sum, p) => sum + p.latency, 0) / proxyList.length) : 0}ms</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Proxies Table */}
                <div className="lg:col-span-2">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Host</th>
                                    <th>Porta</th>
                                    <th>Tipo</th>
                                    <th>Localização</th>
                                    <th>Latência</th>
                                    <th>Status</th>
                                    <th>Chips</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-10 text-[var(--text-muted)]">
                                            Carregando proxies...
                                        </td>
                                    </tr>
                                ) : proxyList.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-10 text-[var(--text-muted)]">
                                            Nenhum proxy cadastrado.
                                        </td>
                                    </tr>
                                ) : proxyList.map((proxy) => {
                                    const statusConfig = getStatusConfig(proxy.status || 'unknown');
                                    const latency = proxy.latencyMs || 0;

                                    return (
                                        <tr key={proxy.id}>
                                            <td className="font-mono text-sm">{proxy.host}</td>
                                            <td className="font-mono text-sm">{proxy.port}</td>
                                            <td>
                                                <span className="px-2 py-1 rounded text-xs bg-[var(--bg-tertiary)]">
                                                    {proxy.type}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="flex items-center gap-2">
                                                    <span>{proxy.country}</span>
                                                    <span className="text-[var(--text-secondary)]">{proxy.city}</span>
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ color: getLatencyColor(latency) }} className="font-medium">
                                                    {latency > 0 ? `${latency}ms` : '-'}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                                                    style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="5" y="2" width="14" height="20" rx="2" />
                                                    </svg>
                                                    {proxy.instances?.length || 0}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <button className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--accent-info)]" title="Testar">
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                                                        </svg>
                                                    </button>
                                                    <button className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-secondary)]" title="Editar">
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--accent-danger)]" 
                                                        title="Remover"
                                                        onClick={() => handleDeleteProxy(proxy.id)}
                                                    >
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3,6 5,6 21,6" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Side Panel */}
                <div className="space-y-6">
                    {/* Health Check */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                            🔍 Health Check
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-[var(--text-muted)]">Último teste</span>
                                    <span className="text-sm text-[var(--text-secondary)]">há 5 min</span>
                                </div>
                                <button className="btn btn-primary w-full">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="23,4 23,10 17,10" />
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                    </svg>
                                    Testar Todos
                                </button>
                            </div>

                            <div className="pt-4 border-t border-[var(--border-color)]">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-[var(--accent-success)]">{proxyList.filter(p => p.status === 'online').length}</div>
                                        <div className="text-xs text-[var(--text-muted)]">Online</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[var(--accent-warning)]">{proxyList.filter(p => p.status === 'slow').length}</div>
                                        <div className="text-xs text-[var(--text-muted)]">Lentos</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[var(--accent-danger)]">{proxyList.filter(p => p.status === 'offline').length}</div>
                                        <div className="text-xs text-[var(--text-muted)]">Offline</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Auto-Rotation */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                            🔄 Auto-Rotação
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                                <span className="text-sm text-[var(--text-primary)]">Rotação Automática</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
                                    <div className="w-11 h-6 bg-[var(--bg-card)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-success)]"></div>
                                </label>
                            </div>

                            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-[var(--text-primary)]">Intervalo</span>
                                    <span className="text-sm font-bold text-[var(--accent-primary)] bg-[var(--accent-primary)]/20 px-2 py-0.5 rounded">24h</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="range"
                                        min="1"
                                        max="72"
                                        defaultValue="24"
                                        className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                                        style={{
                                            background: 'linear-gradient(to right, #8b5cf6 33%, rgba(139, 92, 246, 0.3) 33%)',
                                        }}
                                    />
                                    <style jsx>{`
                                        input[type="range"]::-webkit-slider-thumb {
                                            appearance: none;
                                            width: 20px;
                                            height: 20px;
                                            border-radius: 50%;
                                            background: linear-gradient(135deg, #a855f7, #8b5cf6);
                                            cursor: pointer;
                                            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
                                            border: 2px solid white;
                                        }
                                        input[type="range"]::-moz-range-thumb {
                                            width: 20px;
                                            height: 20px;
                                            border-radius: 50%;
                                            background: linear-gradient(135deg, #a855f7, #8b5cf6);
                                            cursor: pointer;
                                            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
                                            border: 2px solid white;
                                        }
                                    `}</style>
                                </div>
                                <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
                                    <span>1h</span>
                                    <span className="text-[var(--accent-primary)]">●</span>
                                    <span>72h</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                                <span className="text-sm text-[var(--text-primary)]">Fallback p/ Offline</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
                                    <div className="w-11 h-6 bg-[var(--bg-card)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-success)]"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Import */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                            📥 Importar Proxies
                        </h3>

                        <div className="border-2 border-dashed border-[var(--border-color)] rounded-lg p-6 text-center hover:border-[var(--accent-primary)] transition-colors cursor-pointer">
                            <svg className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17,8 12,3 7,8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <p className="text-sm text-[var(--text-muted)]">
                                Arraste um arquivo .txt ou .csv
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                Formato: host:port:user:pass
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Adicionar Proxy */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Adicionar Proxy</h2>
                                <p className="text-sm text-[var(--text-muted)]">Configure um novo proxy SOCKS5 ou HTTP</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">Host / IP</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="192.168.1.100"
                                        value={newProxy.host}
                                        onChange={(e) => setNewProxy({ ...newProxy, host: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Porta</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="1080"
                                        value={newProxy.port}
                                        onChange={(e) => setNewProxy({ ...newProxy, port: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Tipo</label>
                                <select
                                    className="input w-full"
                                    value={newProxy.type}
                                    onChange={(e) => setNewProxy({ ...newProxy, type: e.target.value })}
                                >
                                    <option value="http">🌐 HTTP</option>
                                    <option value="https">🔒 HTTPS</option>
                                    <option value="socks5">🛡️ SOCKS5 (Recomendado)</option>
                                </select>
                            </div>

                            {/* TEST RESULT NOTIFICATION */}
                            {isTesting && (
                                <div className="p-2 rounded bg-blue-500/10 text-blue-400 text-xs text-center animate-pulse flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                    Testando conexão...
                                </div>
                            )}

                            {testResult && (
                                <div className={`p-2 rounded text-xs text-center flex flex-col items-center ${testResult.online ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    <div className="font-bold flex items-center gap-1">
                                        {testResult.online ? '✅ CONECTADO!' : '❌ FALHA'}
                                    </div>
                                    <span className="opacity-80 mt-0.5">
                                        {testResult.online 
                                            ? `Latência: ${testResult.latencyMs}ms` 
                                            : testResult.error || 'Serviço inalcançável'}
                                    </span>
                                </div>
                            )}

                            {/* ACTION TEST BUTTON */}
                            <button
                                type="button"
                                className={`btn w-full text-xs transition-all ${isTesting ? 'opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:brightness-110 hover:shadow-[0_0_15px_rgba(124,58,237,0.5)]'}`}
                                onClick={handleTestProxy}
                                disabled={isTesting || !newProxy.host}
                            >
                                ⚡ Testar Conexão Agora
                            </button>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Usuário (opcional)</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="username"
                                        value={newProxy.username}
                                        onChange={(e) => setNewProxy({ ...newProxy, username: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Senha (opcional)</label>
                                    <input
                                        type="password"
                                        className="input w-full"
                                        placeholder="••••••••"
                                        value={newProxy.password}
                                        onChange={(e) => setNewProxy({ ...newProxy, password: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                className="btn btn-secondary flex-1"
                                onClick={() => setShowModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-success flex-1"
                                onClick={handleAddProxy}
                                disabled={!newProxy.host}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
