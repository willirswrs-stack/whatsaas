'use client';

import { useEffect, useState, useRef } from 'react';
import { Header } from '@/components/Header';
import { warmupService, WarmupStats } from '@/lib/warmup';

const rampStages = [
    { days: '1-3', limit: 10, label: 'Iniciante' },
    { days: '4-7', limit: 25, label: 'Básico' },
    { days: '8-14', limit: 50, label: 'Intermediário' },
    { days: '15+', limit: 100, label: 'Avançado' },
];

const WhatsAppMockup = ({
    simulatedChips,
    visibleMessages,
    isSimulatingTyping,
    setSimulatorVisible,
    chatEndRef,
    bottomPlaceholderRef,
    viewRole // 'A' or 'B'
}: any) => {
    const isViewA = viewRole === 'A';
    const myChip = isViewA ? simulatedChips?.A : simulatedChips?.B;
    const theirChip = isViewA ? simulatedChips?.B : simulatedChips?.A;

    return (
        <div className="w-full xl:max-w-md glass-card p-0 overflow-hidden flex flex-col h-[600px] border border-[var(--border-primary)] shadow-xl rounded-2xl relative">
            {/* Status Bar */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] px-4 py-2.5 flex items-center justify-between z-10 w-full border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center shrink-0 overflow-hidden relative">
                        <svg className="w-8 h-8 text-white mt-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <h3 className="font-medium leading-tight text-[16px]">
                            {theirChip ? theirChip.name : `Simulação IA Ao Vivo`}
                        </h3>
                        <p className="text-[13px] text-[#54656f] dark:text-[#8696a0] shrink-0 truncate max-w-[200px]">
                            {isSimulatingTyping ? (
                                <span className="text-[#027eb5] dark:text-[#53bdeb] italic">digitando...</span>
                            ) : (
                                theirChip ? `visto por último hoje às 14:59` : `Warmup em Andamento`
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 sm:gap-6 items-center">
                    <button className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-full transition-colors hidden sm:block"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg></button>
                    <button className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-full transition-colors"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"></path></svg></button>
                    {isViewA && (
                        <button onClick={() => setSimulatorVisible(false)} className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-full transition-colors ml-[-8px]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Body - WhatsApp Background Data URI */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#efeae2] dark:bg-[#0b141a] relative"
                style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain' }}
                ref={isViewA ? chatEndRef : null}>

                <div className="flex justify-center mb-4 mt-2">
                    <span className="text-[11px] font-medium bg-[#ffeecd] dark:bg-[#182229] dark:text-[#8696a0] px-3 py-1.5 rounded-lg shadow-sm">
                        Hoje, Conversa Gerada por IA
                    </span>
                </div>

                <div className="space-y-[2px] pb-2">
                    {visibleMessages.map((msg: any, idx: number) => {
                        // isSender relative to the current phone's owner role
                        const isSender = msg.role === viewRole;
                        const isFirstInChain = idx === 0 || visibleMessages[idx - 1].role !== msg.role;

                        return (
                            <div key={idx} className={`flex ${isSender ? 'justify-end' : 'justify-start'} ${isFirstInChain ? 'mt-2' : ''}`}>
                                <div className={`relative max-w-[80%] sm:max-w-[65%] px-2 pt-[6px] pb-2 rounded-lg shadow-sm animate-fadeIn ${isSender
                                    ? `bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] ${isFirstInChain ? 'rounded-tr-none' : ''}`
                                    : `bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] ${isFirstInChain ? 'rounded-tl-none' : ''}`
                                    }`}>
                                    <div className="text-[14px] leading-[19px] whitespace-pre-wrap word-break flex flex-wrap items-end gap-2 text-[#111b21] dark:text-[#e9edef] mx-[2px]">
                                        <span>{msg.content}</span>
                                        <div className="text-[11px] text-[#667781] dark:text-[#8696a0] flex items-center gap-1 ml-auto shrink-0 relative top-[2px]">
                                            12:{String((40 + idx) % 60).padStart(2, '0')}
                                            {isSender && (
                                                <svg className="w-[16px] h-[11px] text-[#53bdeb] dark:text-[#53bdeb]" viewBox="0 0 16 15" fill="currentColor">
                                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033L6.03 7.84a.365.365 0 00-.51.063l-.478.372a.365.365 0 00.063.51l2.56 2.05a.73.73 0 001.02-.063L14.947 3.826a.365.365 0 00-.063-.51zm-4.32 2.385l-.478-.372a.365.365 0 00-.51.063L5.432 10.66l-2.02-1.614a.365.365 0 00-.51.063l-.478.372a.365.365 0 00.063.51l2.56 2.05a.73.73 0 001.02-.063l4.63-5.945a.365.365 0 00-.063-.51z" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={isViewA ? bottomPlaceholderRef : null}></div>
                </div>
            </div>

            {/* Input Footer */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-3 py-3 flex gap-3 items-center z-10 sticky bottom-0 border-t border-gray-200 dark:border-gray-800">
                <button className="text-[#54656f] dark:text-[#8696a0] hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-full transition-colors hidden sm:block"><svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill="currentColor"><path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.096-.134-9.288 0-12.129 0zm11.363-1.108s-.666 1.962-1.439 1.962-1.439-.879-1.439-1.962.644-1.962 1.439-1.962 1.439.879 1.439 1.962z"></path></svg></button>
                <button className="text-[#54656f] dark:text-[#8696a0] hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-full transition-colors"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path></svg></button>
                <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-4 py-[9px] text-[15px] text-[#54656f] dark:text-[#d1d7db] shadow-none flex items-center">
                    Mensagem gerada por IA...
                </div>
                <button className="text-[#54656f] dark:text-[#8696a0] hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-full transition-colors"><svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill="currentColor"><path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.531 3.531zM8.969 4.35c0-1.668 1.365-3.031 3.031-3.031s3.031 1.363 3.031 3.031v7.061c0 1.668-1.365 3.031-3.031 3.031s-3.031-1.363-3.031-3.031V4.35zm7.061 7.061c0 2.238-1.848 4.088-4.088 4.088s-4.088-1.85-4.088-4.088H5.942c0 3.03 2.28 5.568 5.163 6.012v2.988h2.001v-2.988c2.884-.445 5.163-2.983 5.163-6.012h-2.238z"></path></svg></button>
            </div>
        </div>
    );
};

export default function WarmupPage() {
    const [stats, setStats] = useState<WarmupStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [generatedConversation, setGeneratedConversation] = useState<any[] | null>(null);
    const [simulatorVisible, setSimulatorVisible] = useState(false);
    const [simulatedChips, setSimulatedChips] = useState<{ A: any, B: any } | null>(null);
    const [visibleMessages, setVisibleMessages] = useState<any[]>([]);
    const [isSimulatingTyping, setIsSimulatingTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const bottomPlaceholderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await warmupService.getStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load warmup stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async (instAId?: string, instBId?: string) => {
        try {
            setActionLoading(true);
            setSimulatorVisible(false); // Reset se já estiver visível

            const result = await warmupService.createSession(instAId, instBId);
            loadData();

            if (result.success && result.conversation) {
                setGeneratedConversation(result.conversation);
                if (result.instA && result.instB) {
                    setSimulatedChips({ A: result.instA, B: result.instB });
                }
                setSimulatorVisible(true);
                setVisibleMessages([]);

                // Play out messages with artificial delays
                setTimeout(() => {
                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    simulateConversationFlow(result.conversation);
                }, 500);
            } else if (result.reason === 'min_instances') {
                alert('Chips insuficientes no Warmup. Adicione pelo menos 2 chips conectados e ative o Warmup nelas.');
            } else {
                alert('Sessão de Warmup manual iniciada/agendada com sucesso!');
            }
        } catch (error) {
            console.error('Failed to start session:', error);
            alert('Erro ao iniciar sessão de Warmup.');
        } finally {
            setActionLoading(false);
        }
    };

    const simulateConversationFlow = (conversation: any[]) => {
        let currentIndex = 0;

        const nextMessage = () => {
            if (currentIndex >= conversation.length) {
                setIsSimulatingTyping(false);
                return;
            }

            // Set typing indicator if it's not the user (Chip A)
            const msg = conversation[currentIndex];
            setIsSimulatingTyping(true);

            // Wait a bit representing reading/typing
            setTimeout(() => {
                setVisibleMessages(prev => [...prev, msg]);
                setIsSimulatingTyping(false);
                currentIndex++;

                // Scroll down
                setTimeout(() => {
                    bottomPlaceholderRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);

                // Wait before next message starts typing
                if (currentIndex < conversation.length) {
                    setTimeout(nextMessage, 1500 + Math.random() * 1000); // 1.5 to 2.5 seconds pause
                }
            }, Math.max(1500, msg.content.length * 50)); // Typing duration based on length
        };

        nextMessage();
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin"></div>
            </div>
        );
    }

    const safeStats = stats || {
        activeChips: 0,
        totalMessagesSent: 0,
        avgHealth: 0,
        instances: []
    };

    return (
        <div className="animate-fadeIn pb-12">
            <Header />

            <div className="page-header container mx-auto px-4 max-w-7xl">
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/warmup.png" alt="Warm-up" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="page-title">Sistema de Warm-up (Anti-Ban)</h1>
                        <p className="text-sm text-[var(--text-muted)]">Maturação automatizada de chips reais para evitar banimentos</p>
                    </div>
                </div>
                <button
                    onClick={() => handleCreateSession()}
                    disabled={actionLoading}
                    className={`flex items-center gap-2 px-4 py-2 ${actionLoading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors font-medium`}
                >
                    {actionLoading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Gerando Cena...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Simular Par Aleatório
                        </>
                    )}
                </button>
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
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                        📈 Estratégia de Rampa
                    </h3>

                    <div className="space-y-4">
                        {rampStages.map((stage, index) => (
                            <div key={index} className="relative">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${index === 0 ? 'bg-red-500' :
                                            index === 1 ? 'bg-orange-500' :
                                                index === 2 ? 'bg-yellow-500' :
                                                    'bg-green-500'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{stage.label}</p>
                                            <p className="text-xs text-[var(--text-muted)]">Dias {stage.days}</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold text-[var(--text-primary)]">
                                        {stage.limit} <span className="text-sm font-normal text-[var(--text-muted)]">msgs/dia</span>
                                    </span>
                                </div>

                                <div className="h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${index === 0 ? 'bg-red-500' :
                                            index === 1 ? 'bg-orange-500' :
                                                index === 2 ? 'bg-yellow-500' :
                                                    'bg-green-500'
                                            }`}
                                        style={{ width: `${(stage.limit / 100) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chips Table */}
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center justify-between">
                        <span>📱 Chips em Warm-up</span>
                        <button onClick={loadData} className="text-xs text-indigo-400 hover:text-indigo-300">Atualizar</button>
                    </h3>

                    <div className="table-container">
                        {safeStats.instances.length > 0 ? (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Número</th>
                                        <th>Dia</th>
                                        <th>Limite Diário</th>
                                        <th>Status do Limite</th>
                                        <th>Saúde do Chip</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeStats.instances.map((chip, index) => (
                                        <tr key={index}>
                                            <td className="font-medium">{chip.phone || chip.id}</td>
                                            <td>
                                                <span className="inline-flex items-center gap-1">
                                                    <span className="text-[var(--accent-warning)]">{chip.day}</span>
                                                    <span className="text-[var(--text-muted)]">/ 14+</span>
                                                </span>
                                            </td>
                                            <td>{chip.dailyLimit || 0} msgs</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs">{chip.sent || 0} env</span>
                                                    <div className="w-16 h-2 rounded-full bg-[var(--bg-tertiary)]">
                                                        <div
                                                            className="h-full rounded-full bg-[var(--accent-primary)]"
                                                            style={{ width: `${Math.min(100, ((chip.sent || 0) / (chip.dailyLimit || 1)) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`font-medium ${chip.health >= 90 ? 'text-[var(--accent-success)]' :
                                                    chip.health >= 75 ? 'text-[var(--accent-warning)]' :
                                                        'text-[var(--accent-danger)]'
                                                    }`}>
                                                    {chip.health}% Saúde
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                                Nenhum chip ativo na maturação do Warmup. Adicione instâncias na tela de Chips e ligue a proteção Inteligente.
                            </div>
                        )}
                    </div>
                </div>

                {/* Chips Pairs */}
                <div className="lg:col-span-3 glass-card p-6 mt-2">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Pares de Conversação Ativos
                        </span>
                        <span className="text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full font-medium">
                            {safeStats.instances.length > 1 ? (safeStats.instances.length * (safeStats.instances.length - 1)) / 2 : 0} Permutações Diárias
                        </span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {safeStats.instances.length > 1 ? (
                            safeStats.instances.flatMap((chipA, i) =>
                                safeStats.instances.slice(i + 1).map((chipB, j) => (
                                    <div key={`${i}-${j}`} className="flex flex-col bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center shrink-0">
                                                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                            </div>
                                            <button
                                                onClick={() => handleCreateSession(chipA.id, chipB.id)}
                                                disabled={actionLoading}
                                                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none flex items-center gap-1 shrink-0"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Assistir
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2 flex-grow">
                                            <div className="text-sm font-medium text-[var(--text-primary)] break-all truncate" title={chipA.phone || chipA.id}>
                                                <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-wider mr-1">Chip A:</span>
                                                {chipA.phone || chipA.id}
                                            </div>
                                            <div className="flex justify-center -my-1 text-gray-400">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                                </svg>
                                            </div>
                                            <div className="text-sm font-medium text-[var(--text-primary)] break-all truncate" title={chipB.phone || chipB.id}>
                                                <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-wider mr-1">Chip B:</span>
                                                {chipB.phone || chipB.id}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )
                        ) : (
                            <div className="col-span-full text-center py-6 text-[var(--text-muted)] border-2 border-dashed border-[var(--border-primary)] rounded-xl">
                                Mínimo de 2 instâncias ativas necessárias para gerar pares.
                            </div>
                        )}
                    </div>
                </div>

                {/* WhatsApp Clone Viewer - Double Mockup */}
                {simulatorVisible && generatedConversation && (
                    <div className="lg:col-span-3 mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Visualização Simultânea dos Dispositivos
                            </h3>
                            <button onClick={() => setSimulatorVisible(false)} className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                Fechar
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 justify-items-center w-full max-w-5xl mx-auto">

                            <div className="w-full flex flex-col gap-2">
                                <div className="text-center font-medium text-sm text-[var(--text-secondary)]">
                                    Visão do Dispositivo: {simulatedChips?.A?.name}
                                </div>
                                <WhatsAppMockup
                                    simulatedChips={simulatedChips}
                                    visibleMessages={visibleMessages}
                                    isSimulatingTyping={isSimulatingTyping}
                                    setSimulatorVisible={setSimulatorVisible}
                                    chatEndRef={chatEndRef}
                                    bottomPlaceholderRef={bottomPlaceholderRef}
                                    viewRole="A"
                                />
                            </div>

                            <div className="w-full flex flex-col gap-2">
                                <div className="text-center font-medium text-sm text-[var(--text-secondary)]">
                                    Visão do Dispositivo: {simulatedChips?.B?.name}
                                </div>
                                <WhatsAppMockup
                                    simulatedChips={simulatedChips}
                                    visibleMessages={visibleMessages}
                                    isSimulatingTyping={isSimulatingTyping}
                                    setSimulatorVisible={setSimulatorVisible}
                                    viewRole="B"
                                />
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
