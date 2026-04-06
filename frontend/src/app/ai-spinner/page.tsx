'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';

const sampleVariations = [
    "Olá {{nome}}! 🎉 Temos uma oferta especial pra você! Aproveite 30% OFF em toda loja. Não perca!",
    "E aí {{nome}}! 🔥 Oferta imperdível te esperando: 30% de desconto em tudo! Corra e garanta!",
    "{{nome}}, boas notícias! ✨ Desconto exclusivo de 30% disponível agora. Aproveite enquanto dura!",
    "Oi {{nome}}! 💫 Promoção relâmpago: 30% OFF em todos os produtos. É por tempo limitado!",
    "Hey {{nome}}! 🚀 Você ganhou 30% de desconto especial. Aproveite essa oportunidade única!",
    "{{nome}}, tudo bem? 🎁 Preparamos 30% de desconto só pra você! Confira agora mesmo!",
];

export default function AISpinnerPage() {
    const [originalMessage, setOriginalMessage] = useState(
        "Olá {{nome}}! Temos uma oferta especial para você! Aproveite 30% de desconto em toda a loja. Não perca essa oportunidade!"
    );
    const [provider, setProvider] = useState('openai');
    const [variations, setVariations] = useState(6);
    const [creativity, setCreativity] = useState(0.7);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => setIsGenerating(false), 2000);
    };

    return (
        <div className="animate-fadeIn">
            <Header />

            <div className="page-header">
                <div className="flex items-center gap-3">
                    <img src="/icons/sidebar/ai_spinner.png" alt="AI Spinner" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="page-title">AI Spinner</h1>
                        <p className="text-sm text-[var(--text-muted)]">Gere variações semânticas para evitar detecção de spam</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="stat-card">
                    <span className="stat-label">Variações Geradas</span>
                    <span className="stat-value">2.450</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Templates Processados</span>
                    <span className="stat-value">48</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Tokens Usados</span>
                    <span className="stat-value">125K</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Economia de Ban</span>
                    <span className="stat-value text-[var(--accent-success)]">~94%</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Panel */}
                <div className="space-y-6">
                    {/* Original Message */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                            Mensagem Original
                        </h3>
                        <textarea
                            className="input min-h-[150px] resize-none"
                            placeholder="Digite a mensagem original que será variada..."
                            value={originalMessage}
                            onChange={(e) => setOriginalMessage(e.target.value)}
                        />
                        <div className="flex items-center gap-2 mt-3 text-xs text-[var(--text-muted)]">
                            <span>Variáveis detectadas:</span>
                            <span className="px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--accent-primary)]">
                                {'{{nome}}'}
                            </span>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                            Configurações
                        </h3>

                        <div className="space-y-6">
                            {/* Provider */}
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                                    Provedor LLM
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'openai', label: 'OpenAI', icon: '🧠' },
                                        { id: 'anthropic', label: 'Anthropic', icon: '🤖' },
                                        { id: 'llama', label: 'Llama', icon: '🦙' },
                                    ].map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setProvider(p.id)}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${provider === p.id
                                                ? 'border-[var(--accent-primary)] bg-[rgba(139,92,246,0.15)] text-[var(--accent-primary)]'
                                                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass)]'
                                                }`}
                                        >
                                            <span className="text-lg mr-2">{p.icon}</span>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Number of Variations */}
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                                    Número de Variações: <span className="text-[var(--accent-primary)] font-semibold">{variations}</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={variations}
                                    onChange={(e) => setVariations(Number(e.target.value))}
                                    className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                                />
                                <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                                    <span>1</span>
                                    <span>20</span>
                                </div>
                            </div>

                            {/* Creativity */}
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                                    Criatividade: <span className="text-[var(--accent-primary)] font-semibold">{(creativity * 100).toFixed(0)}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={creativity}
                                    onChange={(e) => setCreativity(Number(e.target.value))}
                                    className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                                />
                                <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                                    <span>Conservador</span>
                                    <span>Criativo</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="btn btn-primary w-full mt-6"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                        <path d="M12 2a10 10 0 0 1 10 10" />
                                    </svg>
                                    Gerando variações...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M12 1v2M12 21v2" />
                                    </svg>
                                    Gerar Variações
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Output Panel */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                            Variações Geradas
                        </h3>
                        <span className="text-sm text-[var(--text-muted)]">{sampleVariations.length} variações</span>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {sampleVariations.map((variation, index) => (
                            <div
                                key={index}
                                className="p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-colors group"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <span className="text-xs text-[var(--text-muted)] mb-2 block">
                                            Variação #{index + 1}
                                        </span>
                                        <p className="text-sm text-[var(--text-primary)]">{variation}</p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-muted)]" title="Copiar">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                            </svg>
                                        </button>
                                        <button className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--accent-success)]" title="Usar">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="20,6 9,17 4,12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                        <button className="btn btn-ghost text-sm">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copiar Todas
                        </button>
                        <button className="btn btn-success text-sm">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17,21 17,13 7,13 7,21" />
                            </svg>
                            Salvar Template
                        </button>
                    </div>
                </div>
            </div>

            {/* How it works */}
            <div className="mt-8 glass-card p-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                    🧠 Como funciona o AI Spinner
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3 text-white font-bold">
                            1
                        </div>
                        <p className="font-medium text-[var(--text-primary)]">Mensagem Original</p>
                        <p className="text-sm text-[var(--text-muted)]">Você escreve o texto base</p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3 text-white font-bold">
                            2
                        </div>
                        <p className="font-medium text-[var(--text-primary)]">Análise Semântica</p>
                        <p className="text-sm text-[var(--text-muted)]">IA entende a intenção</p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3 text-white font-bold">
                            3
                        </div>
                        <p className="font-medium text-[var(--text-primary)]">Geração de Variações</p>
                        <p className="text-sm text-[var(--text-muted)]">Cria versões únicas</p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3 text-white font-bold">
                            4
                        </div>
                        <p className="font-medium text-[var(--text-primary)]">Anti-Spam</p>
                        <p className="text-sm text-[var(--text-muted)]">Cada envio é único</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
