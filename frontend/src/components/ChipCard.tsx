'use client';

import { useState, useEffect } from 'react';
import { instancesService } from '@/lib/instances';

interface ChipCardProps {
    phone: string;
    status: 'active' | 'warmup' | 'cooldown' | 'banned' | 'connecting' | 'connected' | 'disconnected' | string;
    warmupDay?: number;
    warmupEnabled?: boolean;
    isSystemSeed?: boolean;
    dailyLimit: number;
    dailySent: number;
    proxy?: string;
    instanceId: string;
    metaConfig?: Record<string, any>;
    onQrCode?: (instanceId: string) => void;
    onConfig?: (instanceId: string) => void;
    onDelete?: (instanceId: string) => void;
    onWarmupToggle?: (instanceId: string, enabled: boolean) => void;
}

const statusLabels: Record<string, string> = {
    active: 'Ativo',
    warmup: 'Warm-up',
    cooldown: 'Cooldown',
    banned: 'Banido',
    connecting: 'Conectando',
    connected: 'Conectado',
    disconnected: 'Desconectado',
};

function HealthBadge({ score }: { score: number }) {
    const getColor = () => {
        if (score >= 85) return { bg: 'bg-green-500/20', text: 'text-green-700 dark:text-green-400', label: 'Excelente' };
        if (score >= 70) return { bg: 'bg-lime-500/20', text: 'text-lime-700 dark:text-lime-400', label: 'Boa' };
        if (score >= 50) return { bg: 'bg-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-400', label: 'Moderada' };
        if (score >= 30) return { bg: 'bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', label: 'Baixa' };
        return { bg: 'bg-red-500/20', text: 'text-red-700 dark:text-red-400', label: 'Crítica' };
    };
    const { bg, text, label } = getColor();

    // segmented bar
    const segments = 5;
    const filled = Math.round((score / 100) * segments);

    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${bg}`}>
            <div className="flex gap-0.5">
                {Array.from({ length: segments }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-sm ${i < filled ? text.replace('text-', 'bg-') : 'bg-white/10'}`}
                    />
                ))}
            </div>
            <span className={`text-[10px] font-semibold ${text}`}>{score}%</span>
        </div>
    );
}

export function ChipCard({
    phone,
    status,
    warmupDay,
    warmupEnabled = false,
    isSystemSeed = false,
    dailyLimit,
    dailySent,
    proxy,
    instanceId,
    metaConfig,
    onQrCode,
    onConfig,
    onDelete,
    onWarmupToggle,
}: ChipCardProps) {
    const [healthScore, setHealthScore] = useState<number | null>(null);
    const [isWarmupEnabled, setIsWarmupEnabled] = useState(warmupEnabled);
    const [isTogglingWarmup, setIsTogglingWarmup] = useState(false);
    const [currentVoice, setCurrentVoice] = useState(metaConfig?.voiceProfile || 'alloy');
    const [isUpdatingVoice, setIsUpdatingVoice] = useState(false);
    const [showAdvancedWarmup, setShowAdvancedWarmup] = useState(false);
    const [nicheText, setNicheText] = useState(metaConfig?.warmupNiche || '');
    const [groupWarmup, setGroupWarmup] = useState(!!metaConfig?.groupWarmupEnabled);
    const [groupDay, setGroupDay] = useState(Number(metaConfig?.groupWarmupDay) || 5);
    const [customLinks, setCustomLinks] = useState<string>((metaConfig?.customGroupLinks || []).join('\n'));
    const [isSavingAdvanced, setIsSavingAdvanced] = useState(false);

    const voices = [
        { id: 'alloy', name: 'Alloy', category: 'Neutro' },
        { id: 'echo', name: 'Echo', category: 'Masculino' },
        { id: 'onyx', name: 'Onyx', category: 'Grave' },
        { id: 'nova', name: 'Nova', category: 'Energética' },
        { id: 'shimmer', name: 'Shimmer', category: 'Suave' },
        { id: 'fable', name: 'Fable', category: 'Narrativo' },
    ];

    useEffect(() => {
        // Load health score
        instancesService.getHealth(instanceId)
            .then(data => setHealthScore(data.score))
            .catch(() => {
                // Fallback: calculate simple health from local data
                const usageRatio = dailySent / (dailyLimit || 1);
                const baseScore = status === 'connected' || status === 'active' ? 70 : 30;
                const warmupBonus = (warmupDay || 0) >= 14 ? 20 : Math.round(((warmupDay || 0) / 14) * 15);
                const usagePenalty = usageRatio > 0.9 ? -15 : usageRatio > 0.7 ? -5 : 0;
                setHealthScore(Math.min(100, Math.max(0, baseScore + warmupBonus + usagePenalty)));
            });
    }, [instanceId, status, dailySent, dailyLimit, warmupDay]);

    const handleWarmupToggle = async () => {
        if (isTogglingWarmup) return;
        setIsTogglingWarmup(true);
        try {
            await instancesService.toggleWarmup(instanceId, !isWarmupEnabled);
            setIsWarmupEnabled(!isWarmupEnabled);
            onWarmupToggle?.(instanceId, !isWarmupEnabled);
        } catch (err) {
            console.error('Failed to toggle warmup:', err);
        } finally {
            setIsTogglingWarmup(false);
        }
    };

    const handleVoiceChange = async (voiceId: string) => {
        if (isUpdatingVoice || voiceId === currentVoice) return;
        setIsUpdatingVoice(true);
        try {
            await instancesService.update(instanceId, {
                metaConfig: { voiceProfile: voiceId }
            } as any);
            setCurrentVoice(voiceId);
        } catch (err) {
            console.error('Failed to update voice:', err);
        } finally {
            setIsUpdatingVoice(false);
        }
    };

    const handleSaveAdvanced = async () => {
        if (isSavingAdvanced) return;
        setIsSavingAdvanced(true);
        try {
            const parsedLinks = customLinks
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 10 && l.includes('chat.whatsapp.com'));

            await instancesService.update(instanceId, {
                metaConfig: { 
                    warmupNiche: nicheText,
                    groupWarmupEnabled: groupWarmup,
                    groupWarmupDay: groupDay,
                    customGroupLinks: parsedLinks
                }
            } as any);
        } catch (err) {
            console.error('Failed to update advanced warmup config:', err);
        } finally {
            setIsSavingAdvanced(false);
        }
    };

    const progressPercentage = dailyLimit > 0 ? (dailySent / dailyLimit) * 100 : 0;

    return (
        <div className="chip-card flex flex-col gap-3">
            {/* Header: phone + status */}
            <div className="chip-header">
                <div className="flex flex-col gap-1">
                    <span className="chip-phone">{phone || 'Sem número'}</span>
                    {isSystemSeed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium self-start">
                            🌱 Semente do Sistema
                        </span>
                    )}
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`badge badge-${status}`}>
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {statusLabels[status] || 'Conectando'}
                    </span>
                    {isWarmupEnabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium flex items-center gap-1">
                            🔥 Warmup
                        </span>
                    )}
                </div>
            </div>

            {/* Health Score */}
            <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Saúde do Chip</span>
                {healthScore !== null ? (
                    <HealthBadge score={healthScore} />
                ) : (
                    <div className="w-20 h-5 bg-[var(--bg-tertiary)] rounded-full animate-pulse" />
                )}
            </div>

            {/* Warmup day progress */}
            {(status === 'warmup' || isWarmupEnabled) && warmupDay !== undefined && (
                <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[var(--text-muted)]">Maturação</span>
                        <span className="text-[var(--text-secondary)]">Dia {warmupDay}/14</span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill bg-gradient-to-r from-orange-500 to-amber-400"
                            style={{ width: `${Math.min(100, (warmupDay / 14) * 100)}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Daily sends */}
            <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[var(--text-muted)]">Envios Hoje</span>
                    <span className="text-[var(--text-secondary)]">
                        {dailySent}/{dailyLimit}
                    </span>
                </div>
                <div className="progress-bar">
                    <div
                        className={`progress-fill ${progressPercentage > 90 ? 'bg-red-500' : progressPercentage > 70 ? 'bg-yellow-500' : ''}`}
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            </div>

            {/* Proxy info */}
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    {proxy || 'Sem proxy'}
                </div>
                <span className="text-[10px]">{instanceId.substring(0, 8)}...</span>
            </div>

            {/* Warmup toggle */}
            <div className="flex items-center justify-between py-2 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">
                        {isWarmupEnabled ? '🔥 Aquecimento ativo' : 'Aquecimento'}
                    </span>
                </div>
                <button
                    onClick={handleWarmupToggle}
                    disabled={isTogglingWarmup}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${isWarmupEnabled ? 'bg-orange-500' : 'bg-[var(--bg-tertiary)]'}`}
                    title={isWarmupEnabled ? 'Desativar aquecimento' : 'Ativar aquecimento'}
                >
                    <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isWarmupEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                </button>
            </div>

            {/* Voice Config — PREMIUN NEON DESIGN AS PER USER MOCKUP */}
            <div className="flex items-center justify-between py-2 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center w-5 h-5">
                        <div className="absolute inset-0 bg-fuchsia-500 opacity-20 blur-md rounded-full" />
                        <svg className="w-4 h-4 text-fuchsia-500 filter drop-shadow-[0_0_3px_rgba(217,70,239,0.8)]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm7 9c0 3.87-3.13 7-7 7s-7-3.13-7-7H3c0 4.53 3.32 8.36 7.57 8.93V22h2.86v-3.07c4.25-.57 7.57-4.4 7.57-8.93h-2z"/>
                        </svg>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">Estilo de voz</span>
                </div>
                
                <div className="relative flex items-center gap-2">
                    {isUpdatingVoice && <div className="w-3 h-3 border border-fuchsia-400 border-t-transparent rounded-full animate-spin" />}
                    <select
                        value={currentVoice}
                        disabled={isUpdatingVoice}
                        onChange={(e) => handleVoiceChange(e.target.value)}
                        className={`
                            appearance-none bg-[#1e1b2e]/40 border border-fuchsia-500/30 hover:border-fuchsia-500/80 text-fuchsia-300 text-[11px] font-bold tracking-wide 
                            rounded-full px-3 py-1 pr-6 transition-all duration-300 cursor-pointer outline-none
                            shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_8px_rgba(217,70,239,0.2)]
                            hover:shadow-[0_0_12px_rgba(217,70,239,0.4)]
                        `}
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23d946ef'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                            backgroundSize: '10px'
                        }}
                    >
                        {voices.map(v => (
                            <option key={v.id} value={v.id} className="bg-[#1a1c24] text-white">{v.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Advanced Niche config toggle */}
            <div className="border-t border-[var(--border-color)] pt-1">
                <button 
                    onClick={() => setShowAdvancedWarmup(!showAdvancedWarmup)}
                    className="w-full flex items-center justify-between py-1.5 text-[10px] text-[var(--text-muted)] hover:text-orange-300 font-semibold uppercase tracking-wider transition-colors outline-none"
                >
                    <span className="flex items-center gap-1">
                        ⚙️ Aquecimento por Nicho
                    </span>
                    <svg 
                        className={`w-3 h-3 transition-transform duration-200 ${showAdvancedWarmup ? 'rotate-180' : ''}`} 
                        fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                    >
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>

                {showAdvancedWarmup && (
                    <div className="flex flex-col gap-2 py-2 px-2 bg-black/20 border border-orange-500/20 rounded-lg animate-fadeIn mt-1 mb-2">
                        <div>
                            <label className="text-[9px] font-medium text-orange-300 mb-1 block">Nicho / Segmento</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Marketing Digital, Emagrecimento"
                                value={nicheText}
                                onChange={(e) => setNicheText(e.target.value)}
                                className="w-full bg-[#1a1c24] border border-[var(--border-color)] focus:border-orange-500/50 text-xs rounded px-2 py-1 text-white focus:outline-none transition-all"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[9px] text-[var(--text-muted)]">Automação de Grupos</span>
                            <button
                                onClick={() => setGroupWarmup(!groupWarmup)}
                                className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none ${groupWarmup ? 'bg-orange-500' : 'bg-[#2a2d3a]'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${groupWarmup ? 'translate-x-4' : ''}`} />
                            </button>
                        </div>

                        {groupWarmup && (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-[var(--text-muted)]">Maturidade mínima (Dia)</span>
                                    <input 
                                        type="number" 
                                        min="1"
                                        max="14"
                                        value={groupDay}
                                        onChange={(e) => setGroupDay(Number(e.target.value))}
                                        className="w-12 bg-[#1a1c24] border border-[var(--border-color)] focus:border-orange-500/50 text-[10px] rounded px-1 py-0.5 text-center text-white focus:outline-none"
                                    />
                                </div>

                                <div className="mt-1">
                                    <label className="text-[9px] font-medium text-orange-300 mb-1 block">Links de Grupos Personalizados (Um por linha)</label>
                                    <textarea 
                                        placeholder="Opcional: https://chat.whatsapp.com/..."
                                        value={customLinks}
                                        onChange={(e) => setCustomLinks(e.target.value)}
                                        rows={2}
                                        className="w-full bg-[#1a1c24] border border-[var(--border-color)] focus:border-orange-500/50 text-[9px] rounded px-2 py-1 text-white focus:outline-none transition-all font-mono resize-none"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            onClick={handleSaveAdvanced}
                            disabled={isSavingAdvanced}
                            className="w-full bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 text-[10px] font-bold py-1 rounded transition-all flex items-center justify-center gap-1"
                        >
                            {isSavingAdvanced ? (
                                <div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Confirmar Configuração'
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-color)]">
                <button
                    className="btn btn-ghost flex-1 text-xs py-2"
                    onClick={() => onQrCode?.(instanceId)}
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 3v18" />
                    </svg>
                    QR Code
                </button>
                <button
                    className="btn btn-ghost flex-1 text-xs py-2"
                    onClick={() => onConfig?.(instanceId)}
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42" />
                    </svg>
                    Config
                </button>
                <button
                    className="btn btn-ghost flex-1 text-xs py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => onDelete?.(instanceId)}
                    title="Excluir instância"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    Excluir
                </button>
            </div>
        </div>
    );
}
