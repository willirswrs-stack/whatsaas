'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { authService } from '@/lib/auth';
import api from '@/lib/api';
import { LlmProvider as LlmProviderType, PROVIDER_LABELS, PROVIDER_MODELS } from '@/contexts/LlmContext';

type Tab = 'prompts' | 'warmup' | 'llm';

interface GlobalSettings {
    // Prompts
    agentPromptMain: string;
    agentPromptSpinner: string;
    agentPromptAntiban: string;
    // Warmup days
    warmupDaysColdOutbound: number;
    warmupDaysWarmOutbound: number;
    warmupDaysGroups: number;
    warmupDaysInbound: number;
    // LLM
    globalLlmProvider: LlmProviderType;
    globalLlmModel: string;
    globalLlmTemperature: number;
    globalLlmMaxTokens: number;
    // API Keys
    openaiKey: string;
    anthropicKey: string;
    geminiKey: string;
    groqKey: string;
    elevenLabsKey: string;
}

const DEFAULT_SETTINGS: GlobalSettings = {
    agentPromptMain: 'Você é um assistente especialista em Marketing Digital e automação via WhatsApp. Ajude o usuário a configurar campanhas, criar fluxos e evitar banimentos.',
    agentPromptSpinner: 'Você é um especialista em copywriting para WhatsApp. Reescreva o texto fornecido de {count} formas diferentes, mantendo o significado original mas variando vocabulário e estrutura. Retorne apenas as variações, separadas por "---".',
    agentPromptAntiban: 'Você analisa mensagens de WhatsApp e reescreve de forma mais natural e humana, evitando padrões que podem ser detectados como spam. Mantenha o tom e a intenção original.',
    warmupDaysColdOutbound: 60,
    warmupDaysWarmOutbound: 30,
    warmupDaysGroups: 30,
    warmupDaysInbound: 14,
    globalLlmProvider: 'openai',
    globalLlmModel: 'gpt-4o-mini',
    globalLlmTemperature: 0.7,
    globalLlmMaxTokens: 2048,
    openaiKey: '',
    anthropicKey: '',
    geminiKey: '',
    groqKey: '',
    elevenLabsKey: '',
};

const WARMUP_PROFILES = [
    { key: 'warmupDaysColdOutbound', label: 'Prospecção Fria', icon: '🧊', color: 'blue', min: 30, max: 90, desc: 'Chips novos para contatos frios — risco alto de ban.' },
    { key: 'warmupDaysWarmOutbound', label: 'Prospecção Quente', icon: '🔥', color: 'orange', min: 14, max: 60, desc: 'Chips para contatos que já conhecem a marca.' },
    { key: 'warmupDaysGroups', label: 'Aquecimento em Grupos', icon: '👥', color: 'purple', min: 14, max: 60, desc: 'Chips que participam de grupos para ganhar reputação.' },
    { key: 'warmupDaysInbound', label: 'Receptivo', icon: '📥', color: 'green', min: 7, max: 30, desc: 'Chips que só recebem mensagens — risco baixo.' },
] as const;

export default function SuperAdminConfigPage() {
    const { isSuperAdmin, isLoading } = useSuperAdmin({ redirect: true });
    const [activeTab, setActiveTab] = useState<Tab>('llm');
    const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [showKeys, setShowKeys] = useState({ openai: false, anthropic: false, gemini: false, groq: false, elevenLabs: false });

    const loadSettings = useCallback(async () => {
        try {
            const res = await api.get('/settings/global');
            setSettings(prev => ({ ...prev, ...res.data }));
        } catch { /* silent */ }
    }, []);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    useEffect(() => {
        if (successMsg) {
            const t = setTimeout(() => setSuccessMsg(''), 3500);
            return () => clearTimeout(t);
        }
    }, [successMsg]);

    // When provider changes, reset model to first option
    useEffect(() => {
        const models = PROVIDER_MODELS[settings.globalLlmProvider];
        if (models && !models.find(m => m.value === settings.globalLlmModel)) {
            setSettings(prev => ({ ...prev, globalLlmModel: models[0].value }));
        }
    }, [settings.globalLlmProvider]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.put('/settings/global', settings);
            setSuccessMsg('✅ Configurações globais salvas com sucesso!');
        } catch {
            setSuccessMsg('❌ Erro de conexão.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (!isSuperAdmin) return null;

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'llm', label: 'LLM Global', icon: '🧠' },
        { id: 'warmup', label: 'Aquecimento', icon: '🔥' },
        { id: 'prompts', label: 'Prompts IA', icon: '💬' },
    ];

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl">🛡️</div>
                        <h1 className="text-2xl font-bold text-white">Configurações Super Admin</h1>
                    </div>
                    <p className="text-[var(--text-muted)] text-sm ml-13">
                        Controles globais da plataforma — visíveis apenas para Super Admins
                    </p>
                </div>
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full border border-indigo-500/30 uppercase tracking-widest">
                    Super Admin
                </span>
            </div>

            {/* Success Toast */}
            {successMsg && (
                <div className={`p-4 rounded-xl text-sm font-medium border ${successMsg.includes('✅')
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                    {successMsg}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2.5 rounded-t-lg text-sm font-medium transition-all border-b-2 -mb-px ${activeTab === tab.id
                            ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                            : 'border-transparent text-[var(--text-muted)] hover:text-white hover:bg-white/5'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ───────── TAB: LLM GLOBAL ───────── */}
            {activeTab === 'llm' && (
                <div className="space-y-6">
                    <div className="glass-card p-6 space-y-5">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">🧠</span>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Modelo de IA Global</h2>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Este modelo será usado em <strong className="text-orange-300">todas</strong> as funções de IA:
                                    AI Spinner, Fluxos, Agente, Aquecimento e Anti-Ban.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Provider</label>
                                <select
                                    className="input w-full"
                                    value={settings.globalLlmProvider}
                                    onChange={e => setSettings(s => ({ ...s, globalLlmProvider: e.target.value as LlmProviderType }))}
                                >
                                    {(Object.entries(PROVIDER_LABELS) as [LlmProviderType, string][]).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Modelo</label>
                                <select
                                    className="input w-full"
                                    value={settings.globalLlmModel}
                                    onChange={e => setSettings(s => ({ ...s, globalLlmModel: e.target.value }))}
                                >
                                    {PROVIDER_MODELS[settings.globalLlmProvider]?.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-[var(--text-muted)]">Temperatura</label>
                                    <span className="text-sm font-mono text-indigo-300 font-bold">{settings.globalLlmTemperature.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="0" max="2" step="0.1"
                                    value={settings.globalLlmTemperature}
                                    onChange={e => setSettings(s => ({ ...s, globalLlmTemperature: parseFloat(e.target.value) }))}
                                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                                    <span>Focado (0)</span><span>Balanceado</span><span>Criativo (2)</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Max Tokens</label>
                                <input
                                    type="number" min="256" max="8192" step="256"
                                    className="input w-full"
                                    value={settings.globalLlmMaxTokens}
                                    onChange={e => setSettings(s => ({ ...s, globalLlmMaxTokens: parseInt(e.target.value) }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* API Keys */}
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl">🔑</span>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Chaves de API</h2>
                                <p className="text-xs text-[var(--text-muted)]">Chaves compartilhadas por toda a plataforma. Os usuários não têm acesso a estas configurações.</p>
                            </div>
                        </div>
                        {[
                            { key: 'openaiKey' as const, label: 'OpenAI', icon: '🧠', show: 'openai' as const, hint: 'platform.openai.com/api-keys' },
                            { key: 'anthropicKey' as const, label: 'Anthropic (Claude)', icon: '🤖', show: 'anthropic' as const, hint: 'console.anthropic.com/settings/keys' },
                            { key: 'geminiKey' as const, label: 'Google Gemini', icon: '✨', show: 'gemini' as const, hint: 'aistudio.google.com/app/apikey' },
                            { key: 'groqKey' as const, label: 'Groq', icon: '⚡', show: 'groq' as const, hint: 'console.groq.com/keys' },
                            { key: 'elevenLabsKey' as const, label: 'ElevenLabs (Voz)', icon: '🎙️', show: 'elevenLabs' as const, hint: 'elevenlabs.io/app/settings/api-keys' },
                        ].map(({ key, label, icon, show, hint }) => (
                            <div key={key}>
                                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                                    <span>{icon}</span> {label}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type={showKeys[show] ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        placeholder="Insira a chave de API..."
                                        className="input flex-1 font-mono text-sm"
                                        value={settings[key]}
                                        onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKeys(k => ({ ...k, [show]: !k[show] }))}
                                        className="px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm"
                                        title={showKeys[show] ? 'Ocultar' : 'Mostrar'}
                                    >
                                        {showKeys[show] ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                    Obtenha em: <span className="text-indigo-400">{hint}</span>
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ───────── TAB: AQUECIMENTO ───────── */}
            {activeTab === 'warmup' && (
                <div className="space-y-4">
                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-sm text-orange-300">
                        🔒 Os valores definidos aqui são <strong>fixos</strong> — usuários veem o perfil escolhido mas não podem alterar a duração.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {WARMUP_PROFILES.map(profile => {
                            const value = settings[profile.key];
                            const pct = ((value - profile.min) / (profile.max - profile.min)) * 100;
                            return (
                                <div key={profile.key} className="glass-card p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-2xl">{profile.icon}</span>
                                        <div>
                                            <h3 className="font-semibold text-white text-sm">{profile.label}</h3>
                                            <p className="text-[10px] text-[var(--text-muted)]">{profile.desc}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-[var(--text-muted)]">Duração de Aquecimento</span>
                                        <span className="text-2xl font-black text-white font-mono">{value}<span className="text-sm font-normal text-[var(--text-muted)] ml-1">dias</span></span>
                                    </div>
                                    <input
                                        type="range"
                                        min={profile.min} max={profile.max} step={1}
                                        value={value}
                                        onChange={e => setSettings(s => ({ ...s, [profile.key]: parseInt(e.target.value) }))}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, var(--primary) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`
                                        }}
                                    />
                                    <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1.5">
                                        <span>{profile.min} dias (mín)</span>
                                        <span>{profile.max} dias (máx)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ───────── TAB: PROMPTS ───────── */}
            {activeTab === 'prompts' && (
                <div className="space-y-5">
                    {[
                        {
                            key: 'agentPromptMain' as const,
                            label: '🤖 Agente Principal',
                            desc: 'Define a personalidade e regras do assistente de chat. Use no Suporte e no Fluxo de Agente IA.',
                            placeholder: 'Você é um assistente especialista em...',
                        },
                        {
                            key: 'agentPromptSpinner' as const,
                            label: '🔄 AI Spinner (Variações)',
                            desc: 'Instrução usada para gerar variações de texto nas campanhas. Use {count} para a quantidade de variações.',
                            placeholder: 'Reescreva o texto de {count} formas diferentes...',
                        },
                        {
                            key: 'agentPromptAntiban' as const,
                            label: '🛡️ Anti-Ban (Humanização)',
                            desc: 'Prompt para reescrever mensagens de forma mais natural, reduzindo risco de bloqueio.',
                            placeholder: 'Reescreva esta mensagem de forma mais natural e humana...',
                        },
                    ].map(prompt => (
                        <div key={prompt.key} className="glass-card p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-white">{prompt.label}</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{prompt.desc}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSettings(s => ({ ...s, [prompt.key]: DEFAULT_SETTINGS[prompt.key] }))}
                                    className="text-xs text-[var(--text-muted)] hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors flex-shrink-0"
                                >
                                    ↩ Padrão
                                </button>
                            </div>
                            <textarea
                                value={settings[prompt.key]}
                                onChange={e => setSettings(s => ({ ...s, [prompt.key]: e.target.value }))}
                                className="w-full h-40 bg-black/30 text-gray-200 p-4 rounded-xl border border-white/10 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm leading-relaxed resize-y placeholder-gray-600"
                                placeholder={prompt.placeholder}
                            />
                            <div className="text-right text-[10px] text-[var(--text-muted)] mt-1">
                                {settings[prompt.key].length} caracteres
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Botão Salvar */}
            <div className="flex justify-end pt-2">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Salvando...
                        </>
                    ) : '💾 Salvar Configurações Globais'}
                </button>
            </div>
        </div>
    );
}
