'use client';

interface ChipCardProps {
    phone: string;
    status: 'active' | 'warmup' | 'cooldown' | 'banned' | 'connecting' | 'connected' | 'disconnected' | string;
    warmupDay?: number;
    dailyLimit: number;
    dailySent: number;
    proxy?: string;
    instanceId: string;
    onQrCode?: (instanceId: string) => void;
    onConfig?: (instanceId: string) => void;
    onDelete?: (instanceId: string) => void;
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

export function ChipCard({
    phone,
    status,
    warmupDay,
    dailyLimit,
    dailySent,
    proxy,
    instanceId,
    onQrCode,
    onConfig,
    onDelete,
}: ChipCardProps) {
    const progressPercentage = dailyLimit > 0 ? (dailySent / dailyLimit) * 100 : 0;

    return (
        <div className="chip-card">
            <div className="chip-header">
                <span className="chip-phone">{phone || 'Sem número'}</span>
                <span className={`badge badge-${status}`}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {statusLabels[status] || 'Conectando'}
                </span>
            </div>

            {status === 'warmup' && warmupDay !== undefined && (
                <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-[var(--text-muted)]">Maturação</span>
                        <span className="text-[var(--text-secondary)]">Dia {warmupDay}/14</span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${(warmupDay / 14) * 100}%` }}
                        ></div>
                    </div>
                </div>
            )}

            <div>
                <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[var(--text-muted)]">Envios Hoje</span>
                    <span className="text-[var(--text-secondary)]">
                        {dailySent}/{dailyLimit}
                    </span>
                </div>
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    {proxy || 'Sem proxy'}
                </div>
                <span className="text-[10px]">{instanceId.substring(0, 8)}...</span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
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
