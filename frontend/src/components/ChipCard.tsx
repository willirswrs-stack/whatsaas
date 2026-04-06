'use client';

import { useState, useEffect } from 'react';
import { instancesService } from '@/lib/instances';

interface ChipCardProps {
    phone: string;
    status: 'active' | 'warmup' | 'cooldown' | 'banned' | 'connecting' | 'connected' | 'disconnected' | string;
    warmupDay?: number;
    warmupEnabled?: boolean;
    dailyLimit: number;
    dailySent: number;
    proxy?: string;
    instanceId: string;
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
    dailyLimit,
    dailySent,
    proxy,
    instanceId,
    onQrCode,
    onConfig,
    onDelete,
    onWarmupToggle,
}: ChipCardProps) {
    const [healthScore, setHealthScore] = useState<number | null>(null);
    const [isWarmupEnabled, setIsWarmupEnabled] = useState(warmupEnabled);
    const [isTogglingWarmup, setIsTogglingWarmup] = useState(false);

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

    const progressPercentage = dailyLimit > 0 ? (dailySent / dailyLimit) * 100 : 0;

    return (
        <div className="chip-card flex flex-col gap-3">
            {/* Header: phone + status */}
            <div className="chip-header">
                <span className="chip-phone">{phone || 'Sem número'}</span>
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
