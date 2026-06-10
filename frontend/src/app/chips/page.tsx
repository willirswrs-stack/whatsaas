'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { ChipCard } from '@/components/ChipCard';
import { instancesService, Instance, ProviderType } from '@/lib/instances';
import { getErrorMessage } from '@/lib/auth';
import api from '@/lib/api';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useLlm } from '@/contexts/LlmContext';

export default function ChipsPage() {
    const { isSuperAdmin } = useSuperAdmin();
    const { llmConfig } = useLlm();
    const [instances, setInstances] = useState<Instance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [newInstanceName, setNewInstanceName] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<ProviderType>('evolution');
    const [selectedWarmupProfile, setSelectedWarmupProfile] = useState<'inbound' | 'warm_outbound' | 'cold_outbound' | 'groups'>('cold_outbound');
    const [warmupDay, setWarmupDay] = useState<number>(60);
    const [isWaba, setIsWaba] = useState(false);
    const [wabaId, setWabaId] = useState('');
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [wabaToken, setWabaToken] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [configInstanceId, setConfigInstanceId] = useState<string | null>(null);
    const [proxies, setProxies] = useState<{ id: string; host: string }[]>([]);
    const [selectedProxyId, setSelectedProxyId] = useState<string>('');
    const [connectionMethod, setConnectionMethod] = useState<'qr' | 'pairing'>('qr');
    const [pairingPhone, setPairingPhone] = useState('');
    const [pairingCode, setPairingCode] = useState('');
    const [isGeneratingPairingCode, setIsGeneratingPairingCode] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState<string>('alloy');
    const [selectedVoiceSpeed, setSelectedVoiceSpeed] = useState<number>(1.0);
    const [selectedVoiceModel, setSelectedVoiceModel] = useState<'tts-1' | 'tts-1-hd'>('tts-1-hd');
    const [customVoiceName, setCustomVoiceName] = useState<string>('');
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const [isCloningVoice, setIsCloningVoice] = useState(false);
    const [isSystemSeed, setIsSystemSeed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    // Polling de status após criar instância com QR Code ou Pairing Code
    useEffect(() => {
        if ((qrCode || pairingCode) && createdInstanceId) {
            setConnectionStatus(pairingCode ? '🔑 Aguardando inserção do código no celular...' : 'Aguardando escaneamento do QR Code...');

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
                            setPairingCode('');
                            setPairingPhone('');
                            setConnectionMethod('qr');
                            setShowModal(false);
                            setCreatedInstanceId(null);
                            setConnectionStatus('');
                            loadInstances();
                        }, 2000);
                    } else if (providerStatus.status === 'scan_qr') {
                        setConnectionStatus(pairingCode ? '🔑 Digite o código de pareamento no seu WhatsApp...' : '📱 Escaneie o QR Code com seu WhatsApp...');
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
    }, [qrCode, pairingCode, createdInstanceId]);

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

            const config = isWaba ? {
                wabaId,
                phoneNumberId,
                token: wabaToken
            } : undefined;

            // Backend retorna { instance, qrCode } diretamente
            const result = await instancesService.create({
                name: newInstanceName,
                provider: selectedProvider,
                warmupProfile: selectedWarmupProfile,
                warmupDay: warmupDay,
                config
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
            setCreatedInstanceId(instanceId);
            setPairingCode('');
            setPairingPhone('');
            setConnectionMethod('qr');
            
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

    const generatePairingCode = async () => {
        if (!createdInstanceId || !pairingPhone.trim()) return;

        try {
            setIsGeneratingPairingCode(true);
            setError('');
            setConnectionStatus('Gerando código de pareamento...');
            
            const result = await instancesService.getPairingCode(createdInstanceId, pairingPhone);
            if (result.pairingCode) {
                setPairingCode(result.pairingCode);
                if (result.phone) {
                    setPairingPhone(result.phone);
                }
                setConnectionStatus('Código gerado com sucesso!');
            } else {
                setError('Erro ao obter código de pareamento.');
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsGeneratingPairingCode(false);
        }
    };

    const openConfig = (instanceId: string) => {
        const instance = instances.find(i => i.id === instanceId);
        setConfigInstanceId(instanceId);
        setSelectedProxyId(instance?.proxy?.id || '');
        
        const savedVoice = instance?.metaConfig?.voiceProfile || 'alloy';
        const presets = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
        
        if (!presets.includes(savedVoice) && savedVoice) {
            setSelectedVoice('custom');
            setCustomVoiceName(savedVoice);
        } else {
            setSelectedVoice(savedVoice);
            setCustomVoiceName('');
        }
        
        setSelectedVoiceSpeed(Number(instance?.metaConfig?.voiceSpeed) || 1.0);
        setSelectedVoiceModel((instance?.metaConfig?.voiceModel as any) === 'tts-1' ? 'tts-1' : 'tts-1-hd');
        setIsSystemSeed(!!instance?.isSystemSeed);
        setSelectedWarmupProfile(instance?.warmupProfile || 'cold_outbound');
        setWarmupDay(instance?.warmupDay || 60);
    };

    const saveConfig = async () => {
        if (!configInstanceId) return;
        try {
            const finalVoice = selectedVoice === 'custom' ? customVoiceName : selectedVoice;
            
            await instancesService.update(configInstanceId, {
                proxyId: selectedProxyId || null,
                isSystemSeed: isSystemSeed,
                warmupProfile: selectedWarmupProfile,
                warmupDay: warmupDay,
                metaConfig: { 
                    voiceProfile: finalVoice || 'alloy',
                    voiceSpeed: selectedVoiceSpeed,
                    voiceModel: selectedVoiceModel
                }
            } as any);
            setSuccessMessage('Configuração salva!');
            setConfigInstanceId(null);
            loadInstances();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handlePreviewAudio = async () => {
        if (isPlayingPreview) return;
        const previewVoice = selectedVoice === 'custom' ? customVoiceName : selectedVoice;
        if (!previewVoice) {
            alert('Por favor, informe o nome/ID da voz para ouvir a amostra.');
            return;
        }
        
        setIsPlayingPreview(true);
        try {
            const res = await api.post('/ai/preview', { 
                voice: previewVoice, 
                speed: selectedVoiceSpeed,
                model: selectedVoiceModel
            });
            if (res.data?.audioBase64) {
                const audio = new Audio(`data:audio/mpeg;base64,${res.data.audioBase64}`);
                audio.play();
                audio.onended = () => setIsPlayingPreview(false);
                audio.onerror = () => {
                    alert('Erro ao carregar arquivo de áudio.');
                    setIsPlayingPreview(false);
                };
            }
        } catch (err) {
            console.error('Preview Error', err);
            alert('Falha ao carregar preview de voz da API.');
            setIsPlayingPreview(false);
        }
    };

    const handleCloneVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsCloningVoice(true);
        setSuccessMessage('');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', `Clone_${new Date().toLocaleDateString()}`);
        
        try {
            const res = await api.post('/ai/clone-voice', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data?.voiceId) {
                setSelectedVoice('custom');
                setCustomVoiceName(res.data.voiceId);
                setSuccessMessage('🔥 Voz clonada com sucesso na ElevenLabs!');
            }
        } catch (err: any) {
            console.error('Clone error', err);
            alert(err.response?.data?.message || 'Erro ao tentar clonar voz. Verifique se a chave da ElevenLabs está no .env');
        } finally {
            setIsCloningVoice(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
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
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/chips.png" alt="Gestão de Chips" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="page-title">Gestão de Chips</h1>
                    </div>
                </div>
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
                                warmupEnabled={instance.warmupEnabled ?? true}
                                isSystemSeed={instance.isSystemSeed}
                                proxy={instance.proxy?.host || 'Sem proxy'}
                                metaConfig={instance.metaConfig}
                                onQrCode={fetchQrCode}
                                onConfig={openConfig}
                                onDelete={deleteInstance}
                                onWarmupToggle={(id, enabled) => {
                                    setInstances(prev => prev.map(i =>
                                        i.id === id ? { ...i, warmupEnabled: enabled } : i
                                    ));
                                }}
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

            {/* Modal para criar/conectar instância */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md border border-white/10 shadow-2xl relative bg-[#0d0f14]/95">
                        {/* Botão de Fechar no canto superior direito */}
                        <button
                            className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition-colors"
                            onClick={() => {
                                setShowModal(false);
                                setQrCode('');
                                setPairingCode('');
                                setPairingPhone('');
                                setCreatedInstanceId(null);
                                setConnectionStatus('');
                                loadInstances();
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
                                <span>⚠️</span>
                                <span className="flex-1">{error}</span>
                                <button className="underline font-semibold" onClick={() => setError('')}>Fechar</button>
                            </div>
                        )}

                        {createdInstanceId ? (
                            // Fase de Conexão (já criada ou carregando para pareamento)
                            <>
                                <h2 className="text-xl font-bold mb-1">Conectar WhatsApp</h2>
                                <p className="text-xs text-[var(--text-muted)] mb-4">
                                    Escolha o método de conexão de sua preferência.
                                </p>

                                {/* Tabs do Método de Conexão */}
                                <div className="flex gap-2 p-1 bg-[#161922] rounded-lg mb-6 border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setConnectionMethod('qr');
                                            setError('');
                                        }}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all ${
                                            connectionMethod === 'qr'
                                                ? 'bg-[var(--accent-primary)] text-white shadow'
                                                : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <span>📱</span>
                                        QR Code
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setConnectionMethod('pairing');
                                            setError('');
                                        }}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all ${
                                            connectionMethod === 'pairing'
                                                ? 'bg-[var(--accent-primary)] text-white shadow'
                                                : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <span>🔑</span>
                                        Código de Pareamento
                                    </button>
                                </div>

                                {/* Conteúdo de cada Tab */}
                                {connectionMethod === 'qr' ? (
                                    // Aba QR Code
                                    <div className="text-center">
                                        <p className="mb-4 text-[var(--text-secondary)] text-sm">
                                            Abra o WhatsApp, vá em Aparelhos Conectados e escaneie o código abaixo:
                                        </p>
                                        
                                        {qrCode ? (
                                            <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-[0_0_30px_rgba(34,197,94,0.4)] ring-4 ring-green-500/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(34,197,94,0.6)]">
                                                <img src={qrCode} alt="QR Code" className="w-48 h-48 mx-auto" />
                                            </div>
                                        ) : (
                                            <div className="w-48 h-48 mx-auto bg-white/5 rounded-xl border-2 border-dashed border-green-500/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                                                <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-center gap-2 text-sm mt-2">
                                            {connectionStatus.includes('✅') ? (
                                                <span className="text-green-400 font-medium flex items-center gap-1.5 animate-pulse">
                                                    {connectionStatus}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--text-muted)] flex items-center gap-2">
                                                    <span className="relative flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent-primary)]"></span>
                                                    </span>
                                                    {connectionStatus || 'Aguardando leitura do QR Code...'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    // Aba Pairing Code
                                    <div>
                                        {!pairingCode ? (
                                            // Formulário para gerar código
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">
                                                        Número com DDI (Ex: 55 para Brasil) + DDD + Número
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="input w-full font-mono text-sm tracking-wider"
                                                        placeholder="Ex: 5511999999999"
                                                        value={pairingPhone}
                                                        onChange={(e) => setPairingPhone(e.target.value.replace(/\D/g, ''))}
                                                    />
                                                    <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                                                        Insira apenas números. O número deve conter o código do país (ex: 55 para o Brasil), DDD e o celular.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                                                    onClick={generatePairingCode}
                                                    disabled={isGeneratingPairingCode || !pairingPhone.trim()}
                                                >
                                                    {isGeneratingPairingCode ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                            Gerando Código...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>🔑</span>
                                                            Gerar Código de Pareamento
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            // Código de pareamento gerado com sucesso
                                            <div className="text-center space-y-4">
                                                <p className="text-sm text-[var(--text-secondary)]">
                                                    Seu código de pareamento foi gerado:
                                                </p>

                                                {/* Display do Código */}
                                                <div className="relative group bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-center gap-3">
                                                    <span className="text-3xl font-extrabold tracking-widest text-[var(--accent-primary)] font-mono animate-pulse">
                                                        {pairingCode}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(pairingCode);
                                                            setConnectionStatus('📋 Código copiado!');
                                                            setTimeout(() => setConnectionStatus(''), 2000);
                                                        }}
                                                        title="Copiar código"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {/* Instruções de Pareamento */}
                                                <div className="text-left bg-[var(--bg-secondary)]/50 p-4 rounded-lg border border-[var(--border-subtle)] text-xs space-y-2.5 text-[var(--text-secondary)]">
                                                    <span className="font-bold text-[var(--text-primary)] block mb-1">Como conectar:</span>
                                                    <div className="flex gap-2.5">
                                                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)] flex-shrink-0">1</span>
                                                        <span>Abra o <strong>WhatsApp</strong> no celular que deseja conectar.</span>
                                                    </div>
                                                    <div className="flex gap-2.5">
                                                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)] flex-shrink-0">2</span>
                                                        <span>Vá em <strong>Aparelhos conectados</strong> no menu.</span>
                                                    </div>
                                                    <div className="flex gap-2.5">
                                                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)] flex-shrink-0">3</span>
                                                        <span>Toque em <strong>Conectar aparelho</strong> e depois em <strong>Conectar com número de telefone</strong>.</span>
                                                    </div>
                                                    <div className="flex gap-2.5">
                                                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)] flex-shrink-0">4</span>
                                                        <span>Digite o código <strong>{pairingCode}</strong> exibido acima.</span>
                                                    </div>
                                                </div>

                                                {/* Botão de resetar/voltar para gerar com outro número */}
                                                <div className="pt-2">
                                                    <button
                                                        type="button"
                                                        className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1 mx-auto"
                                                        onClick={() => {
                                                            setPairingCode('');
                                                            setConnectionStatus('');
                                                        }}
                                                    >
                                                        <span>🔄</span> Usar outro número de telefone
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-center gap-2 text-sm mt-4">
                                            {connectionStatus.includes('✅') ? (
                                                <span className="text-green-400 font-medium flex items-center gap-1.5 animate-pulse">
                                                    {connectionStatus}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--text-muted)] flex items-center gap-2">
                                                    <span className="relative flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent-primary)]"></span>
                                                    </span>
                                                    {connectionStatus || 'Aguardando pareamento com o celular...'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
                                    <button
                                        type="button"
                                        className="btn btn-secondary w-full py-2 text-xs font-semibold"
                                        onClick={() => {
                                            setShowModal(false);
                                            setQrCode('');
                                            setPairingCode('');
                                            setPairingPhone('');
                                            setCreatedInstanceId(null);
                                            setConnectionStatus('');
                                            loadInstances();
                                        }}
                                    >
                                        Fechar e Concluir
                                    </button>
                                </div>
                            </>
                        ) : (
                            // Fase de Criação (Instance Form)
                            <>
                                <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Nova Instância WhatsApp</h2>
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Nome da Instância</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="Ex: Chip Principal"
                                        value={newInstanceName}
                                        onChange={(e) => setNewInstanceName(e.target.value)}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Provedor WhatsApp</label>
                                    <select
                                        className="input w-full"
                                        value={selectedProvider}
                                        onChange={(e) => setSelectedProvider(e.target.value as ProviderType)}
                                    >
                                        <option value="evolution">🟢 Evolution API (Recomendado)</option>
                                        <option value="waha">🔵 WAHA (Alternativo)</option>
                                    </select>
                                    <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                                        {selectedProvider === 'evolution'
                                            ? 'Evolution API - Recomendado. Suporta conexão via QR Code e também por código de pareamento por número.'
                                            : 'WAHA - Provedor leve. Suporta somente conexão via escaneamento de QR Code.'
                                        }
                                    </p>
                                </div>

                                {/* TOOGLE DA API OFICIAL (WABA) */}
                                <div className="mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isWaba}
                                            onChange={(e) => setIsWaba(e.target.checked)}
                                            className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--bg-secondary)] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-[var(--bg-primary)]"
                                        />
                                        <span className="text-sm font-bold text-[var(--text-primary)]">Usar API Oficial da Meta (Cloud API)</span>
                                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Premium</span>
                                    </label>
                                    <p className="text-xs text-[var(--text-muted)] mt-1.5 ml-6">
                                        Recomendado para grandes operações (Agency/Enterprise). Exige Business Account ID e Token Permanente.
                                    </p>
                                </div>

                                {isWaba && (
                                    <div className="mb-4 space-y-4 p-5 border border-emerald-500/30 bg-emerald-500/5 rounded-xl">
                                        <div>
                                            <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">WhatsApp Business Account ID</label>
                                            <input type="text" className="input w-full text-sm" value={wabaId} onChange={e => setWabaId(e.target.value)} placeholder="Ex: 104593847593" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">Phone Number ID</label>
                                            <input type="text" className="input w-full text-sm" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} placeholder="Ex: 1029384756" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">Token de Acesso (Permanente)</label>
                                            <input type="password" className="input w-full text-sm" value={wabaToken} onChange={e => setWabaToken(e.target.value)} placeholder="EAAG..." />
                                        </div>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Perfil de Aquecimento</label>
                                    {isSuperAdmin ? (
                                        <select
                                            className="input w-full"
                                            value={selectedWarmupProfile}
                                            onChange={(e) => setSelectedWarmupProfile(e.target.value as any)}
                                        >
                                            <option value="cold_outbound">Prospecção Fria (Risco Alto)</option>
                                            <option value="warm_outbound">Prospecção Quente (Risco Médio)</option>
                                            <option value="groups">Aquecimento em Grupos</option>
                                            <option value="inbound">Receptivo (Risco Baixo)</option>
                                        </select>
                                    ) : (
                                        <select
                                            className="input w-full"
                                            value={selectedWarmupProfile}
                                            onChange={(e) => setSelectedWarmupProfile(e.target.value as any)}
                                        >
                                            <option value="cold_outbound">Prospecção Fria (Risco Alto)</option>
                                            <option value="warm_outbound">Prospecção Quente (Risco Médio)</option>
                                            <option value="groups">Aquecimento em Grupos</option>
                                            <option value="inbound">Receptivo (Risco Baixo)</option>
                                        </select>
                                    )}
                                    <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                                        O tempo mínimo de aquecimento será configurado de acordo com o nicho para maior proteção do chip.
                                    </p>
                                    {!isSuperAdmin && (
                                        <p className="text-[10px] text-orange-400 mt-1 flex items-center gap-1">
                                            🔒 Duração padrão definida pelo administrador
                                        </p>
                                    )}
                                    <div className="mt-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex flex-col gap-2">
                                        <div className="flex justify-between items-end">
                                            <label className="text-xs font-bold text-[var(--text-primary)]">Duração de Maturação (Dias)</label>
                                            <span className="text-xl font-black text-orange-400 font-mono">{warmupDay}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={7} max={90} step={1}
                                            value={warmupDay}
                                            onChange={e => setWarmupDay(parseInt(e.target.value))}
                                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer mt-2"
                                            style={{
                                                background: `linear-gradient(to right, var(--primary) ${((warmupDay - 7) / (90 - 7)) * 100}%, rgba(255,255,255,0.1) ${((warmupDay - 7) / (90 - 7)) * 100}%)`
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        className="btn btn-secondary flex-1"
                                        onClick={() => {
                                            setShowModal(false);
                                            setQrCode('');
                                            setNewInstanceName('');
                                            setSelectedProvider('evolution');
                                            setIsWaba(false);
                                            setWabaId('');
                                            setPhoneNumberId('');
                                            setWabaToken('');
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary flex-1"
                                        onClick={createInstance}
                                        disabled={isCreating || !newInstanceName.trim()}
                                    >
                                        {isCreating ? 'Criando...' : 'Criar Instância'}
                                    </button>
                                </div>
                            </>
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

                        {/* System Seed Toggle */}
                        <div className="mb-6 flex flex-col gap-2 p-3 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-lg">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-green-400 flex items-center gap-2">
                                    🌱 Chip Semente do Sistema
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsSystemSeed(!isSystemSeed)}
                                    className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none ${isSystemSeed ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-700'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isSystemSeed ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                Se ativado, este chip ajudará a aquecer outros clientes. Ele fará conversas ativas com contas novas.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Perfil de Aquecimento (Atual: {instances.find(i => i.id === configInstanceId)?.warmupDay || 0} dias)</label>
                            {isSuperAdmin ? (
                                <select
                                    className="input w-full"
                                    value={selectedWarmupProfile}
                                    onChange={(e) => setSelectedWarmupProfile(e.target.value as any)}
                                >
                                    <option value="cold_outbound">Prospecção Fria (Risco Alto)</option>
                                    <option value="warm_outbound">Prospecção Quente (Risco Médio)</option>
                                    <option value="groups">Aquecimento em Grupos</option>
                                    <option value="inbound">Receptivo (Risco Baixo)</option>
                                </select>
                            ) : (
                                <>
                                    <select
                                        className="input w-full"
                                        value={selectedWarmupProfile}
                                        onChange={(e) => setSelectedWarmupProfile(e.target.value as any)}
                                    >
                                        <option value="cold_outbound">Prospecção Fria (Risco Alto)</option>
                                        <option value="warm_outbound">Prospecção Quente (Risco Médio)</option>
                                        <option value="groups">Aquecimento em Grupos</option>
                                        <option value="inbound">Receptivo (Risco Baixo)</option>
                                    </select>
                                    <p className="text-[10px] text-orange-400 mt-1.5 flex items-center gap-1">
                                        🔒 Duração padrão definida pelo administrador
                                    </p>
                                </>
                            )}
                            <div className="mt-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl flex flex-col gap-2">
                                <div className="flex justify-between items-end">
                                    <label className="text-xs font-bold text-[var(--text-primary)]">Duração de Maturação (Dias)</label>
                                    <span className="text-xl font-black text-orange-400 font-mono">{warmupDay}</span>
                                </div>
                                <input
                                    type="range"
                                    min={7} max={90} step={1}
                                    value={warmupDay}
                                    onChange={e => setWarmupDay(parseInt(e.target.value))}
                                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer mt-2"
                                    style={{
                                        background: `linear-gradient(to right, var(--primary) ${((warmupDay - 7) / (90 - 7)) * 100}%, rgba(255,255,255,0.1) ${((warmupDay - 7) / (90 - 7)) * 100}%)`
                                    }}
                                />
                            </div>
                        </div>

                        <div className="mb-6 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-2xl p-5 relative overflow-hidden">
                            {/* Efeito de brilho de fundo */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -z-10 rounded-full" />

                            <div className="flex items-center justify-between mb-4">
                                <label className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-200">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-indigo-500 dark:text-indigo-400"><path d="M12 2c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm7 9c0 3.87-3.13 7-7 7s-7-3.13-7-7H3c0 4.53 3.32 8.36 7.57 8.93V22h2.86v-3.07c4.25-.57 7.57-4.4 7.57-8.93h-2z"/></svg>
                                    Motor de Voz AI
                                </label>
                                
                                <button
                                    onClick={handlePreviewAudio}
                                    disabled={isPlayingPreview}
                                    type="button"
                                    className={`
                                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                                        ${isPlayingPreview ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 animate-pulse' : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-indigo-500/10 hover:text-indigo-500 hover:border-indigo-500/30'}
                                    `}
                                >
                                    {isPlayingPreview ? (
                                        <>🔊 Tocando...</>
                                    ) : (
                                        <>
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            Ouvir Amostra
                                        </>
                                    )}
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <select
                                        className="input w-full focus:border-indigo-500"
                                        value={selectedVoice}
                                        onChange={(e) => setSelectedVoice(e.target.value)}
                                    >
                                        <optgroup label="Vozes Oficiais OpenAI">
                                            <option value="alloy">Alloy (Versátil)</option>
                                            <option value="echo">Echo (Direta)</option>
                                            <option value="onyx">Onyx (Autoridade)</option>
                                            <option value="nova">Nova (Energética)</option>
                                            <option value="shimmer">Shimmer (Suave)</option>
                                            <option value="fable">Fable (Narrativa)</option>
                                        </optgroup>
                                        <optgroup label="Avançado">
                                            <option value="custom">✨ Usar Voz Customizada (ID)</option>
                                        </optgroup>
                                    </select>
                                </div>

                                {selectedVoice === 'custom' && (
                                    <div className="animate-fadeIn">
                                        <label className="block text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1 font-bold">ID ou Nome da Voz</label>
                                        <input 
                                            type="text" 
                                            className="input w-full text-sm focus:border-indigo-500"
                                            placeholder="Digite o ID da voz (ex: eleven_labs_id)..."
                                            value={customVoiceName}
                                            onChange={(e) => setCustomVoiceName(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="pt-2 border-t border-white/5">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs text-[var(--text-secondary)]">Velocidade da Fala</label>
                                        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-300 font-bold">{selectedVoiceSpeed}x</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.25" 
                                        max="2.0" 
                                        step="0.05"
                                        value={selectedVoiceSpeed}
                                        onChange={(e) => setSelectedVoiceSpeed(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <div className="flex justify-between text-[9px] text-[var(--text-muted)] px-0.5">
                                        <span>Lento</span>
                                        <span>Normal</span>
                                        <span>Rápido</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
                                            🚀 Modo Ultra HD (OpenAI)
                                        </span>
                                        <span className="text-[9px] text-[var(--text-muted)]">Voz mais natural, menos robótica.</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedVoiceModel(prev => prev === 'tts-1' ? 'tts-1-hd' : 'tts-1')}
                                        className={`relative w-8 h-4.5 rounded-full transition-colors ${selectedVoiceModel === 'tts-1-hd' ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${selectedVoiceModel === 'tts-1-hd' ? 'translate-x-3.5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {/* CLONE TRIGGER */}
                                <div className="pt-2">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="audio/*"
                                        onChange={handleCloneVoiceUpload}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isCloningVoice}
                                        className={`
                                            w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all
                                            ${isCloningVoice 
                                                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30 animate-pulse cursor-wait' 
                                                : 'bg-gradient-to-r from-indigo-600/10 to-purple-600/10 dark:from-indigo-600/20 dark:to-purple-600/20 border-indigo-500/30 text-indigo-600 dark:text-indigo-300 hover:from-indigo-500/20 hover:to-purple-500/20 hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                            }
                                        `}
                                    >
                                        {isCloningVoice ? (
                                            <>⌛ PROCESSANDO CLONAGEM...</>
                                        ) : (
                                            <>
                                                <span className="text-base">🧬</span>
                                                CLONAR MINHA VOZ (UPLOAD)
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[9px] text-center text-[var(--text-muted)] mt-1.5">Requer ELEVENLABS_API_KEY no backend.</p>
                                </div>
                            </div>
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
