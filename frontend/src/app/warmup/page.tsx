'use client';
// NOTA: token key = 'accessToken' (ver api.ts)

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Header } from '@/components/Header';
import { warmupService, WarmupStats } from '@/lib/warmup';
import { instancesService } from '@/lib/instances';
import api from '@/lib/api';

const rampStages = [
    { days: '1-3', limit: 10, label: 'Iniciante' },
    { days: '4-7', limit: 25, label: 'Básico' },
    { days: '8-14', limit: 50, label: 'Intermediário' },
    { days: '15+', limit: 100, label: 'Avançado' },
];

// ─── WhatsApp Mockup (unchanged visual) ────────────────────────────────────
const WhatsAppMockup = ({ simulatedChips, visibleMessages, isSimulatingTyping, onClose, viewRole, isLive }: any) => {
    const isViewA = viewRole === 'A';
    const theirChip = isViewA ? simulatedChips?.B : simulatedChips?.A;
    
    const localBottomRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        localBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [visibleMessages.length, isSimulatingTyping]);

    return (
        <div className="w-full xl:max-w-md glass-card p-0 overflow-hidden flex flex-col h-[500px] lg:h-[600px] border border-[var(--border-primary)] shadow-xl rounded-2xl relative">
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] px-4 py-2.5 flex items-center justify-between z-10 w-full border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-8 h-8 text-white mt-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <h3 className="font-medium leading-tight text-[16px] flex items-center gap-2">
                            {theirChip ? (theirChip.phone || theirChip.name) : 'Simulação IA'}
                            {isLive && <span className="flex items-center gap-1 text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-bold"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>AO VIVO</span>}
                        </h3>
                        <p className="text-[13px] text-[#54656f] dark:text-[#8696a0] truncate max-w-[200px]">
                            {isSimulatingTyping ? <span className="text-[#027eb5] dark:text-[#53bdeb] italic">digitando...</span> : (theirChip ? theirChip.phone || 'visto por último hoje' : 'Warmup em Andamento')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    {isViewA && (
                        <button onClick={onClose} className="text-[#54656f] dark:text-[#aebac1] hover:bg-red-500/20 dark:hover:bg-red-500/20 p-2 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#efeae2] dark:bg-[#0b141a] relative"
                style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain' }}>
                <div className="flex justify-center mb-4 mt-2">
                    <span className="text-[11px] font-medium bg-[#ffeecd] dark:bg-[#182229] dark:text-[#8696a0] px-3 py-1.5 rounded-lg shadow-sm">
                        {isLive ? 'Hoje — Conversa Real ao Vivo' : 'Hoje, Conversa Gerada por IA'}
                    </span>
                </div>
                <div className="space-y-[2px] pb-2">
                    {visibleMessages.map((msg: any, idx: number) => {
                        const msgRole = msg.role || msg.sender;
                        const isSender = msgRole === viewRole;
                        const isFirstInChain = idx === 0 || (visibleMessages[idx - 1].role || visibleMessages[idx - 1].sender) !== msgRole;
                        return (
                            <div key={idx} className={`flex ${isSender ? 'justify-end' : 'justify-start'} ${isFirstInChain ? 'mt-2' : ''}`}>
                                <div className={`relative max-w-[80%] sm:max-w-[65%] px-3 pt-[6px] pb-2 rounded-lg shadow-md animate-fadeIn ${isSender
                                    ? `bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] ${isFirstInChain ? 'rounded-tr-none' : ''}`
                                    : `bg-[#ffffff] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] ${isFirstInChain ? 'rounded-tl-none' : ''}`
                                }`}>
                                    {isFirstInChain && (
                                        <div className={`absolute top-0 w-3 h-3 ${isSender ? 'right-[-8px] text-[#d9fdd3] dark:text-[#005c4b]' : 'left-[-8px] text-[#ffffff] dark:text-[#202c33]'}`}>
                                            <svg viewBox="0 0 10 10" className="fill-current">{isSender ? <path d="M0 0 L10 0 L0 10 Z" /> : <path d="M10 0 L0 0 L10 10 Z" />}</svg>
                                        </div>
                                    )}
                                    <div className="text-[14px] leading-[19px] whitespace-pre-wrap word-break flex flex-wrap items-end gap-2 text-[#111b21] dark:text-[#e9edef] mx-[2px]">
                                        {msg.isAudio ? (
                                            <div className="flex items-center gap-2 py-1">
                                                <div className="text-[#53bdeb] shrink-0">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                                                </div>
                                                <div className="flex-1 h-6 flex items-center overflow-hidden opacity-50">
                                                    <div className="w-full h-[2px] bg-current relative">
                                                        <div className="absolute w-2 h-2 rounded-full bg-[#53bdeb] -top-0.5 left-1/4"></div>
                                                    </div>
                                                </div>
                                                <span className="text-xs italic opacity-70">Mensagem de voz</span>
                                            </div>
                                        ) : (
                                            <span>{msg.content}</span>
                                        )}
                                        <div className="text-[11px] text-[#667781] dark:text-[#8696a0] flex items-center gap-1 ml-auto shrink-0 relative top-[2px]">
                                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : `12:${String((40 + idx) % 60).padStart(2, '0')}`}
                                            {isSender && (!msg.status || msg.status === 'sent') && <svg className="w-[16px] h-[11px] text-[#53bdeb]" viewBox="0 0 16 15" fill="currentColor"><path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033L6.03 7.84a.365.365 0 00-.51.063l-.478.372a.365.365 0 00.063.51l2.56 2.05a.73.73 0 001.02-.063L14.947 3.826a.365.365 0 00-.063-.51zm-4.32 2.385l-.478-.372a.365.365 0 00-.51.063L5.432 10.66l-2.02-1.614a.365.365 0 00-.51.063l-.478.372a.365.365 0 00.063.51l2.56 2.05a.73.73 0 001.02-.063l4.63-5.945a.365.365 0 00-.063-.51z" /></svg>}
                                            {isSender && msg.status === 'error' && <span className="text-red-500 font-bold text-[12px]" title="Falha ao enviar">✕</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {isSimulatingTyping && (
                        <div className="flex justify-start mt-2">
                            <div className="bg-[#fff] dark:bg-[#202c33] rounded-lg rounded-tl-none px-4 py-3 shadow-md">
                                <div className="flex gap-1 items-center">
                                    {[0, 150, 300].map(d => <div key={d} className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={localBottomRef} />
                </div>
            </div>

            <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-3 py-3 flex gap-3 items-center z-10 sticky bottom-0 border-t border-gray-200 dark:border-gray-800">
                <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-4 py-[9px] text-[15px] text-[#54656f] dark:text-[#d1d7db] flex items-center">
                    {isLive ? 'Mensagem real sendo enviada...' : 'Mensagem gerada por IA...'}
                </div>
            </div>
        </div>
    );
};

// ─── Page ──────────────────────────────────────────────────────────────────
export default function WarmupPage() {
    const [stats, setStats] = useState<WarmupStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // 🚀 SUPORTE A MÚLTIPLAS SESSÕES SIMULTÂNEAS
    const [activeSessions, setActiveSessions] = useState<Record<string, {
        id: string;
        isLive: boolean;
        chips: { A: any; B: any };
        messages: any[];
        isTyping: boolean;
    }>>({});
    
    const [simulatorVisible, setSimulatorVisible] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [selectedChips, setSelectedChips] = useState<string[]>([]);
    const [liveLoading, setLiveLoading] = useState(false);

    // Modal Config States
    const [configInstanceId, setConfigInstanceId] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<string>('alloy');
    const [selectedVoiceSpeed, setSelectedVoiceSpeed] = useState<number>(1.0);
    const [selectedVoiceModel, setSelectedVoiceModel] = useState<'tts-1' | 'tts-1-hd'>('tts-1-hd');
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const bottomPlaceholderRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        return () => { socketRef.current?.disconnect(); };
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await warmupService.getStats();
            setStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // ── Simulated IA session ──
    const handleCreateSession = async () => {
        try {
            setActionLoading(true);
            setIsLive(false);
            const result = await warmupService.createSession();
            loadData();
            if (result.success && result.conversation) {
                const sid = `sim-${Date.now()}`;
                
                // Add session
                setActiveSessions(prev => ({
                    ...prev,
                    [sid]: {
                        id: sid,
                        isLive: false,
                        chips: { A: result.instA, B: result.instB },
                        messages: [],
                        isTyping: false
                    }
                }));
                
                setSimulatorVisible(true);
                simulateFlow(sid, result.conversation);
            } else if (result.reason === 'min_instances') {
                alert('Chips insuficientes no Warmup.');
            }
        } catch (e) { console.error(e); }
        finally { setActionLoading(false); }
    };
 
    const simulateFlow = (sid: string, conversation: any[]) => {
        let i = 0;
        const next = () => {
            if (i >= conversation.length) { 
                setActiveSessions(prev => prev[sid] ? { ...prev, [sid]: { ...prev[sid], isTyping: false } } : prev);
                return; 
            }
            const msg = conversation[i];
            if (msg.sender && !msg.role) msg.role = msg.sender;
            
            setActiveSessions(prev => prev[sid] ? { ...prev, [sid]: { ...prev[sid], isTyping: true } } : prev);
            
            setTimeout(() => {
                setActiveSessions(prev => {
                    const s = prev[sid];
                    if (!s) return prev;
                    return {
                        ...prev,
                        [sid]: {
                            ...s,
                            isTyping: false,
                            messages: [...s.messages, msg]
                        }
                    };
                });
                i++;
                setTimeout(() => bottomPlaceholderRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                if (i < conversation.length) setTimeout(next, 1500 + Math.random() * 1000);
            }, Math.max(1500, msg.content.length * 50));
        };
        next();
    };

    // ── Live real session ──
    const toggleChip = (id: string) => {
        setSelectedChips(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= 2) return [prev[1], id];
            return [...prev, id];
        });
    };

    const handleStartLive = async () => {
        if (selectedChips.length < 2) return;
        setLiveLoading(true);
 
        // Garante conexão única WebSocket
        if (!socketRef.current) {
            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
            const apiBase = api.defaults.baseURL || 'http://localhost:3333/api/v1';
            const wsBase = apiBase.split('/api/v1')[0]; 
            
            const socket = io(`${wsBase}/events`, { auth: { token }, transports: ['websocket'] });
            socketRef.current = socket;
 
            socket.on('warmup:live-typing', (data: any) => {
                setActiveSessions(prev => prev[data.sessionId] ? { ...prev, [data.sessionId]: { ...prev[data.sessionId], isTyping: true } } : prev);
            });
 
            socket.on('warmup:live-message', (data: any) => {
                setActiveSessions(prev => {
                    const s = prev[data.sessionId];
                    if (!s) return prev;
                    return {
                        ...prev,
                        [data.sessionId]: {
                            ...s,
                            isTyping: false,
                            messages: [...s.messages, data]
                        }
                    };
                });
                setTimeout(() => bottomPlaceholderRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            });
 
            socket.on('warmup:live-end', (data: any) => {
                setActiveSessions(prev => prev[data.sessionId] ? { ...prev, [data.sessionId]: { ...prev[data.sessionId], isTyping: false } } : prev);
            });
        }
 
        try {
            const res = await api.post('/warmup/live-session', { instAId: selectedChips[0], instBId: selectedChips[1] });
            if (res.data.success) {
                const sid = res.data.sessionId;
                // Adiciona no conjunto de sessões ativas
                setActiveSessions(prev => ({
                    ...prev,
                    [sid]: {
                        id: sid,
                        isLive: true,
                        chips: { A: res.data.instA, B: res.data.instB },
                        messages: [],
                        isTyping: false
                    }
                }));
                
                setSimulatorVisible(true);
                setLiveLoading(false);
                setSelectedChips([]); // Limpa para poder selecionar o próximo par!
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
            } else {
                alert(res.data.message || `Erro: ${res.data.reason}`);
                setLiveLoading(false);
            }
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Erro ao iniciar sessão ao vivo.');
            setLiveLoading(false);
        }
    };

    const handleCloseSimulator = () => {
        setSimulatorVisible(false);
        socketRef.current?.disconnect();
    };

    const openConfig = (chip: any) => {
        setConfigInstanceId(chip.id);
        const savedVoice = chip.metaConfig?.voiceProfile || 'alloy';
        const presets = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
        if (!presets.includes(savedVoice) && savedVoice) {
            setSelectedVoice(savedVoice);
        } else {
            setSelectedVoice(savedVoice);
        }
        setSelectedVoiceSpeed(Number(chip.metaConfig?.voiceSpeed) || 1.0);
        setSelectedVoiceModel((chip.metaConfig?.voiceModel as any) === 'tts-1' ? 'tts-1' : 'tts-1-hd');
    };

    const saveConfig = async () => {
        if (!configInstanceId) return;
        try {
            await instancesService.update(configInstanceId, {
                metaConfig: { 
                    voiceProfile: selectedVoice,
                    voiceSpeed: selectedVoiceSpeed,
                    voiceModel: selectedVoiceModel
                }
            } as any);
            alert('Configuração salva com sucesso!');
            setConfigInstanceId(null);
            loadData();
        } catch (err: any) {
            alert('Erro ao salvar: ' + (err.response?.data?.message || err.message));
        }
    };

    const playVoicePreview = async () => {
        if (isPlayingPreview) return;
        if (!selectedVoice) {
            alert('Por favor, informe a voz.');
            return;
        }
        setIsPlayingPreview(true);
        try {
            const res = await api.post('/ai/preview', { 
                voice: selectedVoice, 
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

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
            </div>
        );
    }

    const safeStats = stats || { activeChips: 0, totalMessagesSent: 0, avgHealth: 0, instances: [] };

    return (
        <div className="animate-fadeIn pb-12">
            <Header />

            <div className="page-header container mx-auto px-4 max-w-7xl">
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/warmup.png" alt="Warm-up" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="page-title">Warm-up de Chips</h1>
                        <p className="text-sm text-[var(--text-muted)]">Maturação automatizada de chips e conversas reais em tempo real</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 container mx-auto px-4 max-w-7xl">
                <div className="stat-card glass-card p-5">
                    <span className="stat-label text-sm text-[var(--text-muted)]">Chips em Maturação</span>
                    <span className="stat-value text-[var(--accent-warning)] text-2xl font-bold">{safeStats.activeChips}</span>
                </div>
                <div className="stat-card glass-card p-5">
                    <span className="stat-label text-sm text-[var(--text-muted)]">Mensagens Trocadas (Hoje)</span>
                    <span className="stat-value text-2xl font-bold">{safeStats.totalMessagesSent}</span>
                </div>
                <div className="stat-card glass-card p-5">
                    <span className="stat-label text-sm text-[var(--text-muted)]">Saúde Média</span>
                    <span className={`text-2xl font-bold ${safeStats.avgHealth > 80 ? 'text-[var(--accent-success)]' : 'text-[var(--accent-warning)]'}`}>
                        {Math.round(safeStats.avgHealth)}%
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 container mx-auto px-4 max-w-7xl">
                {/* Ramp Strategy */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">📈 Estratégia de Rampa</h3>
                    <div className="space-y-4">
                        {rampStages.map((stage, index) => (
                            <div key={index} className="relative">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'][index]}`}>{index + 1}</div>
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{stage.label}</p>
                                            <p className="text-xs text-[var(--text-muted)]">Dias {stage.days}</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold text-[var(--text-primary)]">{stage.limit} <span className="text-sm font-normal text-[var(--text-muted)]">msgs/dia</span></span>
                                </div>
                                <div className="h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                                    <div className={`h-full rounded-full ${['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'][index]}`} style={{ width: `${stage.limit}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chips Table — now with selection */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-[var(--text-primary)]">📱 Chips em Warm-up</span>
                            <button onClick={loadData} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Atualizar</button>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={handleCreateSession}
                                disabled={actionLoading || safeStats.instances.length < 2}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {actionLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🔥'}
                                Simular Conversa IA
                            </button>
                            <button
                                onClick={handleStartLive}
                                disabled={selectedChips.length < 2 || liveLoading}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${selectedChips.length === 2
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/20'
                                    : 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
                                }`}
                            >
                                {liveLoading
                                    ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                                {selectedChips.length === 2 ? '🔴 Conversa Real' : `Selecione 2 chips (${selectedChips.length}/2)`}
                            </button>
                        </div>
                    </div>

                    {selectedChips.length < 2 && safeStats.instances.length >= 2 && (
                        <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                            Clique em dois chips para selecioná-los e iniciar uma conversa real entre eles
                        </p>
                    )}

                    <div className="table-container">
                        {safeStats.instances.length > 0 ? (
                            <table className="table w-full">
                                <thead>
                                    <tr><th className="w-8" /><th>Número</th><th>Dia</th><th>Limite</th><th>Status</th><th>Saúde</th><th>Ações</th></tr>
                                </thead>
                                <tbody>
                                    {safeStats.instances.map((chip, index) => {
                                        const isSelected = selectedChips.includes(chip.id);
                                        const selIdx = selectedChips.indexOf(chip.id);
                                        return (
                                            <tr key={index} onClick={() => toggleChip(chip.id)}
                                                className={`cursor-pointer transition-all ${isSelected ? 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/30' : 'hover:bg-white/5'}`}>
                                                <td>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-[#343b4d]'}`}>
                                                        {isSelected ? selIdx + 1 : ''}
                                                    </div>
                                                </td>
                                                <td className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {isSelected && (
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${selIdx === 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                                                {selIdx === 0 ? 'A' : 'B'}
                                                            </span>
                                                        )}
                                                        {chip.phone || chip.id}
                                                        {chip.metaConfig?.voiceProfile && (
                                                            <span className="ml-2 text-[9px] font-bold tracking-wider uppercase flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--bg-secondary)]/50 text-[var(--text-secondary)] border border-[var(--border-color)] group-hover:border-[var(--primary)] transition-all">
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-70"><path d="M12 2c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm7 9c0 3.87-3.13 7-7 7s-7-3.13-7-7H3c0 4.53 3.32 8.36 7.57 8.93V22h2.86v-3.07c4.25-.57 7.57-4.4 7.57-8.93h-2z"/></svg>
                                                                {chip.metaConfig.voiceProfile}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td><span className="text-[var(--accent-warning)]">{chip.day}</span>/14+</td>
                                                <td>{chip.dailyLimit}</td>
                                                <td>{chip.sent} env</td>
                                                <td><span className={chip.health >= 80 ? 'text-green-500' : 'text-yellow-500'}>{chip.health}%</span></td>
                                                <td>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); openConfig(chip); }}
                                                        className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-xs flex items-center gap-1 transition-colors"
                                                    >
                                                        ⚙️ Voz
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : <div className="text-center py-8 text-[var(--text-muted)]">Nenhum chip ativo.</div>}
                    </div>
                </div>
            </div>

            {/* Dashboard de Sessões — Agora INTEGRADO À PÁGINA para permitir múltiplas seleções simultâneas */}
            {Object.keys(activeSessions).length > 0 && (
                <div className="mt-16 pt-12 border-t border-[var(--border-color)] container mx-auto px-4 max-w-7xl flex flex-col relative animate-fadeIn">
                    
                    {/* Floating Controls */}
                    <div className="sticky top-0 z-[110] flex items-center justify-between bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-color)] p-4 rounded-2xl mb-8 max-w-6xl mx-auto w-full shadow-2xl shadow-black/50">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Painel de Controle Real</h2>
                                <p className="text-xs text-[var(--text-secondary)]">{Object.keys(activeSessions).length} {Object.keys(activeSessions).length === 1 ? 'conversa ativa' : 'conversas ativas em paralelo'}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => { 
                                setActiveSessions({}); 
                                setSimulatorVisible(false);
                                if (socketRef.current) socketRef.current.disconnect();
                                socketRef.current = null;
                            }} 
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold uppercase transition-all"
                        >
                            Encerrar Todas
                        </button>
                    </div>

                    <div className="space-y-16 w-full max-w-6xl mx-auto pb-20">
                        {Object.values(activeSessions).map((session) => (
                            <div key={session.id} className="relative animate-slideUp">
                                {/* Background glow for distinct session separation */}
                                <div className="absolute -inset-4 bg-indigo-500/5 rounded-[2rem] blur-xl" />
                                
                                <div className="relative flex flex-col lg:flex-row items-center justify-center gap-6 bg-[var(--bg-secondary)]/30 dark:bg-white/5 border border-[var(--border-color)] p-6 md:p-8 rounded-[2rem]">
                                    
                                    <WhatsAppMockup 
                                        simulatedChips={session.chips} 
                                        visibleMessages={session.messages} 
                                        isSimulatingTyping={session.isTyping} 
                                        onClose={() => {
                                            setActiveSessions(prev => {
                                                const copy = { ...prev };
                                                delete copy[session.id];
                                                return copy;
                                            });
                                        }} 
                                        viewRole="A" 
                                        isLive={session.isLive} 
                                    />
                                    
                                    <div className="hidden lg:flex flex-col items-center gap-3 text-[var(--text-muted)] py-8">
                                        <div className={`w-12 h-12 rounded-full border-2 ${session.isLive ? 'border-red-500/30 text-red-400' : 'border-indigo-500/30 text-indigo-400'} flex items-center justify-center text-xl font-bold bg-[var(--bg-primary)]/50 shadow-lg`}>
                                            {session.isLive ? '🔴' : '🤖'}
                                        </div>
                                        <div className="h-24 w-0.5 bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] transform -rotate-90 my-8">
                                            {session.isLive ? 'CONVERSA REAL' : 'SYNC IA'}
                                        </span>
                                        <div className="h-24 w-0.5 bg-gradient-to-t from-white/20 via-white/5 to-transparent" />
                                    </div>
                                    
                                    <WhatsAppMockup 
                                        simulatedChips={session.chips} 
                                        visibleMessages={session.messages} 
                                        isSimulatingTyping={session.isTyping} 
                                        viewRole="B" 
                                        isLive={session.isLive} 
                                    />
                                    
                                </div>
                            </div>
                        ))}
                        
                        {/* Scroll Anchors dynamically tracked by system hooks */}
                        <div ref={bottomPlaceholderRef} className="h-4 w-full" />
                        <div ref={chatEndRef} className="h-2 w-full" />
                    </div>
                </div>
            )}

            {/* Config Modal */}
            {configInstanceId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)]/50">
                            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                🎙️ Configurar Voz IA
                            </h3>
                            <button onClick={() => setConfigInstanceId(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Voz (OpenAI ou ID ElevenLabs)</label>
                                <select 
                                    className="input w-full px-3 py-2 text-sm"
                                    value={['alloy','echo','fable','onyx','nova','shimmer'].includes(selectedVoice) ? selectedVoice : 'custom'}
                                    onChange={(e) => {
                                        if (e.target.value !== 'custom') {
                                            setSelectedVoice(e.target.value);
                                        } else {
                                            setSelectedVoice('');
                                        }
                                    }}
                                >
                                    <optgroup label="OpenAI (Padrão)">
                                        <option value="alloy">Alloy (Andrógino)</option>
                                        <option value="echo">Echo (Masculino)</option>
                                        <option value="fable">Fable (Masculino/Britânico)</option>
                                        <option value="onyx">Onyx (Masculino Grave)</option>
                                        <option value="nova">Nova (Feminino)</option>
                                        <option value="shimmer">Shimmer (Feminino Claro)</option>
                                    </optgroup>
                                    <optgroup label="ElevenLabs (Customizado)">
                                        <option value="custom">Inserir ID de Voz...</option>
                                    </optgroup>
                                </select>
                                
                                {(!['alloy','echo','fable','onyx','nova','shimmer'].includes(selectedVoice) || selectedVoice === '') && (
                                    <div className="mt-2">
                                        <input 
                                            type="text" 
                                            placeholder="Voice ID do ElevenLabs"
                                            className="input w-full px-3 py-2 text-sm"
                                            value={selectedVoice}
                                            onChange={(e) => setSelectedVoice(e.target.value)}
                                        />
                                        <p className="text-[10px] text-[var(--text-muted)] mt-1">Insira o Voice ID de uma voz clonada no painel ElevenLabs.</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Velocidade: {selectedVoiceSpeed}x</label>
                                    <input 
                                        type="range" min="0.25" max="2.0" step="0.25" 
                                        value={selectedVoiceSpeed} 
                                        onChange={(e) => setSelectedVoiceSpeed(Number(e.target.value))}
                                        className="w-full accent-indigo-500" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Qualidade do Áudio</label>
                                    <select 
                                        className="input w-full px-3 py-2 text-sm"
                                        value={selectedVoiceModel}
                                        onChange={(e) => setSelectedVoiceModel(e.target.value as any)}
                                    >
                                        <option value="tts-1-hd">HD (Melhor qualidade)</option>
                                        <option value="tts-1">Normal (Mais rápido)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex justify-between gap-3 items-center">
                            <button 
                                onClick={playVoicePreview}
                                disabled={isPlayingPreview || !selectedVoice}
                                className="px-4 py-2 bg-[var(--bg-secondary)] text-[#53bdeb] text-sm font-medium rounded-lg border border-[#53bdeb]/30 hover:bg-[#53bdeb]/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isPlayingPreview ? (
                                    <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Testando...</>
                                ) : (
                                    <>▶ Ouvir Amostra</>
                                )}
                            </button>
                            <button 
                                onClick={saveConfig}
                                className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Salvar Voz
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
