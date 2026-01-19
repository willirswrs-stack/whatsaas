'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { ChipCard } from '@/components/ChipCard';
import { instancesService, Instance, ProviderType } from '@/lib/instances';
import { getErrorMessage } from '@/lib/auth';

export default function ChipsPage() {
    const [instances, setInstances] = useState<Instance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [newInstanceName, setNewInstanceName] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<ProviderType>('evolution');
    const [isCreating, setIsCreating] = useState(false);
    const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [configInstanceId, setConfigInstanceId] = useState<string | null>(null);
    const [proxies, setProxies] = useState<{ id: string; host: string }[]>([]);
    const [selectedProxyId, setSelectedProxyId] = useState<string>('');
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

    // Carregar instâncias
    useEffect(() => {
        loadInstances();
        loadProxies();

        // Auto-refresh status a cada 10 segundos
        autoRefreshRef.current = setInterval(() => {
            refreshStatuses();
        }, 10000);

        return () => {
            if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
        };
    }, []);

    // Polling de status após criar instância com QR Code
    useEffect(() => {
        if (qrCode && createdInstanceId) {
            setConnectionStatus('Aguardando escaneamento do QR Code...');

            const pollStatus = async () => {
                try {
                    const { providerStatus } = await instancesService.getStatus(createdInstanceId);

                    if (providerStatus.status === 'connected') {
                        // Conectado com sucesso!
                        if (pollingRef.current) {
                            clearInterval(pollingRef.current);
                            pollingRef.current = null;
                        }
                        setConnectionStatus('✅ Conectado com sucesso!');
                        setSuccessMessage(`WhatsApp conectado: ${providerStatus.phoneNumber || 'Número detectado'}`);

                        // Atualizar lista e fechar modal após 2s
                        setTimeout(() => {
                            setQrCode('');
                            setShowModal(false);
                            setCreatedInstanceId(null);
                            setConnectionStatus('');
                            loadInstances();
                        }, 2000);
                    } else if (providerStatus.status === 'scan_qr') {
                        setConnectionStatus('📱 Escaneie o QR Code com seu WhatsApp...');
                    }
                } catch (err) {
                    console.warn('Polling error:', err);
                }
            };

            // Poll a cada 3 segundos
            pollingRef.current = setInterval(pollStatus, 3000);
            // Executar imediatamente também
            pollStatus();

            return () => {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            };
        }
    }, [qrCode, createdInstanceId]);

    const loadInstances = async () => {
        try {
            setIsLoading(true);
            const data = await instancesService.list();
            setInstances(data);
        } catch (err) {
            setError(getErrorMessage(err));
            // Se der erro 401, provavelmente não está autenticado
            // Usar dados mock para demonstração
            setInstances([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadProxies = async () => {
        try {
            const data = await instancesService.listProxies();
            setProxies(data.map(p => ({ id: p.id, host: p.host })));
        } catch {
            // Ignore - proxies are optional
        }
    };

    const refreshStatuses = async () => {
        if (instances.length === 0) return;

        try {
            // Atualizar status de cada instância
            const updatedInstances = await Promise.all(
                instances.map(async (inst) => {
                    try {
                        const { providerStatus } = await instancesService.getStatus(inst.id);
                        return {
                            ...inst,
                            status: providerStatus.status === 'connected' ? 'connected' :
                                providerStatus.status === 'scan_qr' ? 'connecting' :
                                    providerStatus.status || inst.status,
                            phone: providerStatus.phoneNumber || inst.phone
                        };
                    } catch {
                        return inst;
                    }
                })
            );
            setInstances(updatedInstances as Instance[]);
        } catch {
            // Silently fail
        }
    };

    const createInstance = async () => {
        if (!newInstanceName.trim()) return;

        try {
            setIsCreating(true);
            setError('');
            setConnectionStatus('Criando instância...');

            // Backend retorna { instance, qrCode } diretamente
            const result = await instancesService.create({
                name: newInstanceName,
                provider: selectedProvider
            });
            setInstances([...instances, result.instance]);

            // Salvar ID da instância criada para polling de status
            setCreatedInstanceId(result.instance.id);

            // QR Code já vem na resposta da criação
            if (result.qrCode) {
                setQrCode(result.qrCode);
                setConnectionStatus('Escaneie o QR Code');
            } else {
                // QR code não veio - tentar buscar
                setConnectionStatus('Aguardando QR Code...');
                try {
                    const qrResult = await instancesService.getQrCode(result.instance.id);
                    if (qrResult.qrCode) {
                        setQrCode(qrResult.qrCode);
                        setConnectionStatus('Escaneie o QR Code');
                    } else {
                        setError('QR Code ainda não disponível. A API pode estar iniciando. Tente o botão "QR Code" no card da instância em alguns segundos.');
                        setShowModal(false);
                    }
                } catch {
                    setError('QR Code ainda não disponível. A API pode estar iniciando. Tente o botão "QR Code" no card da instância em alguns segundos.');
                    setShowModal(false);
                }
            }
            setNewInstanceName('');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsCreating(false);
        }
    };


    const deleteInstance = async (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;

        try {
            setIsDeleting(true);
            await instancesService.delete(deleteConfirmId);
            setInstances(instances.filter(i => i.id !== deleteConfirmId));
            setSuccessMessage('Instância removida com sucesso!');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
        }
    };

    const fetchQrCode = async (instanceId: string) => {
        try {
            setError('');
            const result = await instancesService.getQrCode(instanceId);
            if (result.qrCode) {
                setQrCode(result.qrCode);
                setShowModal(true);
            } else {
                setError('QR Code não disponível. A instância pode já estar conectada.');
            }
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const openConfig = (instanceId: string) => {
        const instance = instances.find(i => i.id === instanceId);
        setConfigInstanceId(instanceId);
        setSelectedProxyId(instance?.proxy?.id || '');
    };

    const saveConfig = async () => {
        if (!configInstanceId) return;
        try {
            await instancesService.update(configInstanceId, {
                proxyId: selectedProxyId || null
            });
            setSuccessMessage('Configuração salva!');
            setConfigInstanceId(null);
            loadInstances();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    // Filtrar por status
    const filteredInstances = activeTab === 'all'
        ? instances
        : instances.filter(i => i.status === activeTab);

    // Contar por status
    const counts = {
        all: instances.length,
        connected: instances.filter(i => i.status === 'connected').length,
        connecting: instances.filter(i => i.status === 'connecting').length,
        disconnected: instances.filter(i => i.status === 'disconnected').length,
        banned: instances.filter(i => i.status === 'banned').length,
    };

    const tabs = [
        { id: 'all', label: 'Todos', count: counts.all },
        { id: 'connected', label: 'Ativos', count: counts.connected },
        { id: 'connecting', label: 'Conectando', count: counts.connecting },
        { id: 'disconnected', label: 'Desconectados', count: counts.disconnected },
        { id: 'banned', label: 'Banidos', count: counts.banned },
    ];

    // Stats
    const totalDailyLimit = instances.reduce((sum, i) => sum + (i.dailyLimit || 0), 0);
    const totalSent = instances.reduce((sum, i) => sum + (i.messagesSent || 0), 0);
    const successRate = totalDailyLimit > 0 ? ((totalSent / totalDailyLimit) * 100).toFixed(1) : 0;

    return (
        <div className="animate-fadeIn">
            <Header />

            <div className="page-header">
                <h1 className="page-title">Gestão de Chips</h1>
                <div className="flex gap-2">
                    <a
                        href="http://localhost:8081/manager"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary text-sm flex items-center gap-2"
                        title="Acessar Evolution API"
                    >
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Evolution
                    </a>
                    <a
                        href="http://localhost:8080/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary text-sm flex items-center gap-2"
                        title="Acessar WAHA Dashboard"
                    >
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        WAHA
                    </a>
                    <button className="btn btn-success" onClick={() => setShowModal(true)}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Adicionar Chip
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                    <button className="ml-2 underline" onClick={() => setError('')}>Fechar</button>
                </div>
            )}

            {/* Success Message */}
            {successMessage && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
                    <span>✅</span>
                    {successMessage}
                    <button className="ml-auto underline" onClick={() => setSuccessMessage('')}>Fechar</button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="stat-card">
                    <span className="stat-label">Total de Chips</span>
                    <span className="stat-value">{instances.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Capacidade Diária</span>
                    <span className="stat-value">{totalDailyLimit.toLocaleString()}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Enviados Hoje</span>
                    <span className="stat-value">{totalSent.toLocaleString()}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Taxa de Uso</span>
                    <span className="stat-value">{successRate}%</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--border-color)]">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab.id === activeTab
                            ? 'bg-[var(--accent-primary)] text-white'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-glass)]'
                            }`}
                    >
                        {tab.label}
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-xs">
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Chips Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredInstances.map((instance) => (
                            <ChipCard
                                key={instance.id}
                                phone={instance.phone || instance.instanceName}
                                status={instance.status === 'connected' ? 'active' : instance.status === 'connecting' ? 'warmup' : instance.status as any}
                                dailyLimit={instance.dailyLimit || 10}
                                dailySent={instance.dailySent || 0}
                                instanceId={instance.id}
                                warmupDay={instance.warmupDay}
                                proxy={instance.proxy?.host || 'Sem proxy'}
                                onQrCode={fetchQrCode}
                                onConfig={openConfig}
                                onDelete={deleteInstance}
                            />
                        ))}

                        {/* Empty State */}
                        {filteredInstances.length === 0 && (
                            <div className="col-span-full text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="5" y="2" width="14" height="20" rx="2" />
                                        <line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <p className="text-[var(--text-muted)]">Nenhum chip encontrado</p>
                                <button
                                    className="btn btn-primary mt-4"
                                    onClick={() => setShowModal(true)}
                                >
                                    Adicionar primeiro chip
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Instructions */}
            <div className="mt-8 glass-card p-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                    📱 Como adicionar um novo chip
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold shrink-0">
                            1
                        </div>
                        <div>
                            <p className="font-medium text-[var(--text-primary)]">Clique em &quot;Adicionar Chip&quot;</p>
                            <p className="text-sm text-[var(--text-muted)]">Uma nova instância será criada na API WhatsApp</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold shrink-0">
                            2
                        </div>
                        <div>
                            <p className="font-medium text-[var(--text-primary)]">Escaneie o QR Code</p>
                            <p className="text-sm text-[var(--text-muted)]">Use o WhatsApp do chip para conectar</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold shrink-0">
                            3
                        </div>
                        <div>
                            <p className="font-medium text-[var(--text-primary)]">Configure o proxy</p>
                            <p className="text-sm text-[var(--text-muted)]">Associe um proxy para proteger o chip</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal para criar instância */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Nova Instância WhatsApp</h2>

                        {qrCode ? (
                            <div className="text-center">
                                <p className="mb-4 text-[var(--text-secondary)]">Escaneie o QR Code com seu WhatsApp:</p>
                                <div className="bg-white p-4 rounded-lg inline-block mb-4">
                                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                                </div>
                                <div className="flex items-center justify-center gap-2 text-sm">
                                    {connectionStatus.includes('✅') ? (
                                        <span className="text-green-400">{connectionStatus}</span>
                                    ) : (
                                        <>
                                            <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                                            <span className="text-[var(--text-muted)]">{connectionStatus || 'Aguardando conexão...'}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Nome da Instância</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="Ex: Chip Principal"
                                        value={newInstanceName}
                                        onChange={(e) => setNewInstanceName(e.target.value)}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Provedor WhatsApp</label>
                                    <select
                                        className="input w-full"
                                        value={selectedProvider}
                                        onChange={(e) => setSelectedProvider(e.target.value as ProviderType)}
                                    >
                                        <option value="evolution">🟢 Evolution API (Recomendado)</option>
                                        <option value="waha">🔵 WAHA (Alternativo)</option>
                                    </select>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        {selectedProvider === 'evolution'
                                            ? 'Evolution API - Estável, multi-sessão, API REST nativa'
                                            : 'WAHA - Alternativa leve (suporta múltiplas sessões)'
                                        }
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        className="btn btn-secondary flex-1"
                                        onClick={() => {
                                            setShowModal(false);
                                            setQrCode('');
                                            setNewInstanceName('');
                                            setSelectedProvider('evolution');
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="btn btn-primary flex-1"
                                        onClick={createInstance}
                                        disabled={isCreating || !newInstanceName.trim()}
                                    >
                                        {isCreating ? 'Criando...' : 'Criar e Conectar'}
                                    </button>
                                </div>
                            </>
                        )}

                        {qrCode && (
                            <button
                                className="btn btn-secondary w-full mt-4"
                                onClick={() => {
                                    setShowModal(false);
                                    setQrCode('');
                                    setCreatedInstanceId(null);
                                    setConnectionStatus('');
                                    loadInstances();
                                }}
                            >
                                Fechar
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-sm text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Excluir Instância?</h2>
                        <p className="text-[var(--text-secondary)] mb-6">
                            Esta ação irá remover a instância permanentemente. Você terá que criar uma nova e escanear o QR Code novamente.
                        </p>
                        <div className="flex gap-3">
                            <button
                                className="btn btn-secondary flex-1"
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={isDeleting}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn flex-1 bg-red-500 hover:bg-red-600 text-white"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Excluindo...
                                    </span>
                                ) : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Configuração */}
            {configInstanceId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-[var(--accent-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Configurar Instância</h2>
                                <p className="text-sm text-[var(--text-muted)]">
                                    {instances.find(i => i.id === configInstanceId)?.instanceName || 'Instância'}
                                </p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Proxy</label>
                            <select
                                className="input w-full"
                                value={selectedProxyId}
                                onChange={(e) => setSelectedProxyId(e.target.value)}
                            >
                                <option value="">Sem proxy</option>
                                {proxies.map((proxy) => (
                                    <option key={proxy.id} value={proxy.id}>
                                        🛡️ {proxy.host}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                Use um proxy para proteger a instância e evitar bloqueios
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                className="btn btn-secondary flex-1"
                                onClick={() => setConfigInstanceId(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary flex-1"
                                onClick={saveConfig}
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
