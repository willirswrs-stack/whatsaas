'use client';

import { Header } from '@/components/Header';

const warmupChips = [
    { phone: '+55 11 98888-5678', day: 8, dailyLimit: 50, sent: 32, health: 92, conversations: 156 },
    { phone: '+55 51 94444-1234', day: 3, dailyLimit: 25, sent: 18, health: 78, conversations: 45 },
    { phone: '+55 85 91111-2222', day: 12, dailyLimit: 75, sent: 68, health: 95, conversations: 234 },
    { phone: '+55 27 90000-3333', day: 5, dailyLimit: 35, sent: 28, health: 85, conversations: 89 },
    { phone: '+55 48 98765-4321', day: 1, dailyLimit: 10, sent: 8, health: 70, conversations: 12 },
    { phone: '+55 19 97654-3210', day: 10, dailyLimit: 60, sent: 54, health: 88, conversations: 198 },
];

const conversationLogs = [
    { from: '+55 11 98888-5678', to: '+55 51 94444-1234', message: 'Oi, tudo bem?', time: '14:32' },
    { from: '+55 51 94444-1234', to: '+55 11 98888-5678', message: 'Tudo ótimo! E você?', time: '14:33' },
    { from: '+55 85 91111-2222', to: '+55 27 90000-3333', message: 'Bom dia! Como está o dia aí?', time: '14:35' },
    { from: '+55 27 90000-3333', to: '+55 85 91111-2222', message: 'Está ótimo, fazendo sol!', time: '14:36' },
    { from: '+55 11 98888-5678', to: '+55 85 91111-2222', message: '🎵 Áudio (0:15)', time: '14:38' },
];

const rampStages = [
    { days: '1-3', limit: 10, label: 'Iniciante' },
    { days: '4-7', limit: 25, label: 'Básico' },
    { days: '8-14', limit: 50, label: 'Intermediário' },
    { days: '15+', limit: 100, label: 'Avançado' },
];

export default function WarmupPage() {
    return (
        <div className="animate-fadeIn">
            <Header />

            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2c.5 5.5-2.5 8.5-2.5 12a5 5 0 1 0 10 0c0-3.5-3-6.5-2.5-12" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="page-title">Sistema de Warm-up</h1>
                        <p className="text-sm text-[var(--text-muted)]">Maturação automatizada de chips para evitar banimentos</p>
                    </div>
                </div>
                <button className="btn btn-success">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Adicionar ao Warm-up
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="stat-card">
                    <span className="stat-label">Chips em Maturação</span>
                    <span className="stat-value text-[var(--accent-warning)]">8</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Conversas Simuladas Hoje</span>
                    <span className="stat-value">156</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Grupos Ativos</span>
                    <span className="stat-value">12</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Taxa de Sucesso</span>
                    <span className="stat-value text-[var(--accent-success)]">96%</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                        📱 Chips em Warm-up
                    </h3>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Número</th>
                                    <th>Dia</th>
                                    <th>Limite</th>
                                    <th>Enviados</th>
                                    <th>Saúde</th>
                                    <th>Conversas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {warmupChips.map((chip, index) => (
                                    <tr key={index}>
                                        <td className="font-medium">{chip.phone}</td>
                                        <td>
                                            <span className="inline-flex items-center gap-1">
                                                <span className="text-[var(--accent-warning)]">{chip.day}</span>
                                                <span className="text-[var(--text-muted)]">/14</span>
                                            </span>
                                        </td>
                                        <td>{chip.dailyLimit}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span>{chip.sent}</span>
                                                <div className="w-16 h-2 rounded-full bg-[var(--bg-tertiary)]">
                                                    <div
                                                        className="h-full rounded-full bg-[var(--accent-primary)]"
                                                        style={{ width: `${(chip.sent / chip.dailyLimit) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`font-medium ${chip.health >= 90 ? 'text-[var(--accent-success)]' :
                                                    chip.health >= 75 ? 'text-[var(--accent-warning)]' :
                                                        'text-[var(--accent-danger)]'
                                                }`}>
                                                {chip.health}%
                                            </span>
                                        </td>
                                        <td>{chip.conversations}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Conversations and Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Simulated Conversations */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                        💬 Conversas Simuladas (Tempo Real)
                    </h3>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {conversationLogs.map((log, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
                                <div className="w-8 h-8 rounded-full bg-[var(--whatsapp-green)] flex items-center justify-center text-white text-xs shrink-0">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {log.from} → {log.to}
                                        </span>
                                        <span className="text-xs text-[var(--text-muted)]">{log.time}</span>
                                    </div>
                                    <p className="text-sm text-[var(--text-primary)]">{log.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Settings */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                        ⚙️ Configurações de Simulação
                    </h3>

                    <div className="space-y-4">
                        {/* Typing Indicator */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[var(--bg-card)] flex items-center justify-center">
                                    <span className="text-lg">⌨️</span>
                                </div>
                                <div>
                                    <p className="font-medium text-[var(--text-primary)]">Indicador &quot;Digitando...&quot;</p>
                                    <p className="text-xs text-[var(--text-muted)]">Simula digitação proporcional ao texto</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-[var(--bg-card)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-success)]"></div>
                            </label>
                        </div>

                        {/* Audio Recording */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[var(--bg-card)] flex items-center justify-center">
                                    <span className="text-lg">🎙️</span>
                                </div>
                                <div>
                                    <p className="font-medium text-[var(--text-primary)]">Indicador &quot;Gravando áudio&quot;</p>
                                    <p className="text-xs text-[var(--text-muted)]">Simula gravação de áudios</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-[var(--bg-card)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-success)]"></div>
                            </label>
                        </div>

                        {/* Auto Groups */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[var(--bg-card)] flex items-center justify-center">
                                    <span className="text-lg">👥</span>
                                </div>
                                <div>
                                    <p className="font-medium text-[var(--text-primary)]">Grupos Temporários</p>
                                    <p className="text-xs text-[var(--text-muted)]">Cria e interage em grupos automaticamente</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-[var(--bg-card)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-success)]"></div>
                            </label>
                        </div>

                        {/* Conversation Frequency */}
                        <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-card)] flex items-center justify-center">
                                        <span className="text-lg">⏱️</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-[var(--text-primary)]">Frequência de Conversas</p>
                                        <p className="text-xs text-[var(--text-muted)]">Intervalo entre mensagens simuladas</p>
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-[var(--accent-primary)]">15-30 min</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="60"
                                defaultValue="15"
                                className="w-full h-2 bg-[var(--bg-card)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
