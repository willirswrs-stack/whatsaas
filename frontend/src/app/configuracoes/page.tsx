'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components';
import { authService } from '@/lib/auth';
import api from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useLlm } from '@/contexts/LlmContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { llmConfig, providerLabel, modelLabel } = useLlm();
    const { isSuperAdmin } = useSuperAdmin();
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [apiKeys, setApiKeys] = useState({
        openaiKey: '',
        anthropicKey: '',
        geminiKey: '',
        groqKey: '',
        elevenLabsKey: '',
    });
    const [showKeys, setShowKeys] = useState({ openai: false, anthropic: false, gemini: false, groq: false, elevenLabs: false });

    const tabs = [
        { id: 'general', label: 'Geral', icon: '⚙️' },
        { id: 'account', label: 'Conta', icon: '👤' },
        { id: 'billing', label: 'Faturamento', icon: '💳' },
        { id: 'api', label: 'API & Webhooks', icon: '🔌' },
        { id: 'team', label: 'Equipe', icon: '👥' },
        { id: 'notifications', label: 'Notificações', icon: '🔔' },
    ];

    // Carregar configurações do backend
    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (successMsg) {
            const t = setTimeout(() => setSuccessMsg(''), 3000);
            return () => clearTimeout(t);
        }
    }, [successMsg]);

    const loadSettings = async () => {
        try {
            const res = await api.get('/settings');
            const data = res.data;
            setApiKeys({
                openaiKey: data.openaiKey || '',
                anthropicKey: data.anthropicKey || '',
                geminiKey: data.geminiKey || '',
                groqKey: data.groqKey || '',
                elevenLabsKey: data.elevenLabsKey || '',
            });
        } catch (err) {
            console.error('Erro ao carregar configurações:', err);
        }
    };

    const saveApiKeys = async () => {
        setIsSaving(true);
        try {
            await api.put('/settings', apiKeys);
            setSuccessMsg('Configurações salvas com sucesso!');
        } catch (err) {
            console.error('Erro ao salvar:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="animate-fadeIn">
            <Header />

            {/* Page Header */}
            <div className="mb-8 flex items-center gap-3">
                <img src="/icons/sidebar/settings.png" alt="Configurações" className="w-10 h-10 object-contain drop-shadow-md" />
                <div>
                    <h1 className="page-title mb-0">Configurações</h1>
                    <p className="text-[var(--text-muted)]">
                        Gerencie as configurações da sua conta e plataforma
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Tabs Sidebar */}
                <div className="lg:col-span-1">
                    <div className="glass p-4 rounded-xl">
                        <nav className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${activeTab === tab.id
                                        ? 'bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]'
                                        : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                        }`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="lg:col-span-3">
                    {activeTab === 'general' && (
                        <div className="glass p-6 rounded-xl space-y-6">
                            <h2 className="text-xl font-semibold text-white">Configurações Gerais</h2>

                            {/* LLM Status Card */}
                            <div className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg">🧠</div>
                                    <div>
                                        <p className="text-sm font-semibold text-indigo-900 dark:text-white">IA Ativa na Plataforma</p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {providerLabel} — <span className="text-indigo-700 dark:text-indigo-300 font-medium">{modelLabel}</span>
                                        </p>
                                    </div>
                                </div>
                                {isSuperAdmin ? (
                                    <a href="/admin/ai-agent" className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/30 transition-colors border border-indigo-500/30">
                                        ⚙️ Configurar
                                    </a>
                                ) : (
                                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">🔒 Definido pelo admin</span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nome da Empresa</label>
                                    <input type="text" className="input w-full" defaultValue="Minha Empresa LTDA" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Fuso Horário</label>
                                    <select className="input w-full">
                                        <option>America/Sao_Paulo (GMT-3)</option>
                                        <option>America/Manaus (GMT-4)</option>
                                        <option>America/Recife (GMT-3)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Idioma</label>
                                    <select className="input w-full">
                                        <option>Português (Brasil)</option>
                                        <option>English</option>
                                        <option>Español</option>
                                    </select>
                                </div>

                                <div className="pt-4 border-t border-[var(--border-subtle)]">
                                    <h3 className="font-medium text-[var(--text-primary)] mb-4">Aparência</h3>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setTheme('light')}
                                            className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${theme === 'light'
                                                ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                                : 'border-[var(--border-color)] hover:border-[var(--primary)]/50'
                                                }`}
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-medium text-[var(--text-primary)]">Claro</span>
                                        </button>

                                        <button
                                            onClick={() => setTheme('dark')}
                                            className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${theme === 'dark'
                                                ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                                : 'border-[var(--border-color)] hover:border-[var(--primary)]/50'
                                                }`}
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-medium text-[var(--text-primary)]">Escuro</span>
                                        </button>

                                        <button
                                            onClick={() => setTheme('system')}
                                            className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${theme === 'system'
                                                ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                                : 'border-[var(--border-color)] hover:border-[var(--primary)]/50'
                                                }`}
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white to-gray-900 border border-gray-400 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <rect x="2" y="3" width="20" height="14" rx="2" />
                                                    <path d="M8 21h8M12 17v4" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-medium text-[var(--text-primary)]">Sistema</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[var(--border-subtle)]">
                                    <h3 className="font-medium text-[var(--text-primary)] mb-4">Preferências de Envio</h3>

                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3">
                                            <input type="checkbox" className="rounded" defaultChecked />
                                            <span className="text-[var(--text-secondary)]">Simular digitação antes de enviar</span>
                                        </label>
                                        <label className="flex items-center gap-3">
                                            <input type="checkbox" className="rounded" defaultChecked />
                                            <span className="text-[var(--text-secondary)]">Usar delay aleatório entre mensagens</span>
                                        </label>
                                        <label className="flex items-center gap-3">
                                            <input type="checkbox" className="rounded" />
                                            <span className="text-[var(--text-secondary)]">Pausar envios aos finais de semana</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button className="btn btn-primary">Salvar Alterações</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="space-y-6">
                            <div className="glass p-6 rounded-xl">
                                <h2 className="text-xl font-semibold text-white mb-6">Informações da Conta</h2>

                                <div className="flex items-center gap-6 mb-6">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-2xl font-bold text-white">
                                        JD
                                    </div>
                                    <div>
                                        <button className="btn btn-secondary text-sm">Alterar Foto</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Nome</label>
                                        <input type="text" className="input w-full" defaultValue="João da Silva" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Email</label>
                                        <input type="email" className="input w-full" defaultValue="joao@empresa.com" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Telefone</label>
                                        <input type="tel" className="input w-full" defaultValue="+55 11 99999-9999" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Cargo</label>
                                        <input type="text" className="input w-full" defaultValue="Administrador" />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button className="btn btn-primary">Salvar</button>
                                </div>
                            </div>

                            <div className="glass p-6 rounded-xl">
                                <h2 className="text-xl font-semibold text-white mb-6">Alterar Senha</h2>
                                <div className="space-y-4 max-w-md">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Senha Atual</label>
                                        <input type="password" className="input w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Nova Senha</label>
                                        <input type="password" className="input w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Confirmar Nova Senha</label>
                                        <input type="password" className="input w-full" />
                                    </div>
                                    <button className="btn btn-primary">Alterar Senha</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'integrations' && (
                        <div className="glass p-6 rounded-xl space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-white">Integrações IA</h2>
                                {successMsg && (
                                    <span className="text-green-400 text-sm animate-pulse">{successMsg}</span>
                                )}
                            </div>

                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <p className="text-sm text-blue-400">
                                    💡 Configure suas API keys para habilitar recursos de IA em todo o aplicativo.
                                    Suas chaves são criptografadas e nunca são expostas.
                                </p>
                            </div>

                            {/* OpenAI */}
                            <div className="p-4 border border-[var(--border-subtle)] rounded-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-lg">✨</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-white">OpenAI (GPT-4)</h3>
                                        <p className="text-xs text-[var(--text-muted)]">GPT-4o, GPT-4 Turbo, o1</p>
                                    </div>
                                    {apiKeys.openaiKey && !apiKeys.openaiKey.includes('*') ? (
                                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">✓ Configurado</span>
                                    ) : apiKeys.openaiKey.includes('*') ? (
                                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">✓ Salvo</span>
                                    ) : (
                                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">⚠ Não configurado</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showKeys.openai ? 'text' : 'password'}
                                            className="input w-full pr-10"
                                            placeholder="sk-proj-..."
                                            value={apiKeys.openaiKey}
                                            onChange={(e) => setApiKeys({ ...apiKeys, openaiKey: e.target.value })}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
                                            onClick={() => setShowKeys({ ...showKeys, openai: !showKeys.openai })}
                                        >
                                            {showKeys.openai ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    Obtenha sua chave em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">platform.openai.com</a>
                                </p>
                            </div>

                            {/* Anthropic */}
                            <div className="p-4 border border-[var(--border-subtle)] rounded-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-lg">🧠</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-white">Anthropic (Claude)</h3>
                                        <p className="text-xs text-[var(--text-muted)]">Claude 3.5 Sonnet, Opus, Haiku</p>
                                    </div>
                                    {apiKeys.anthropicKey && !apiKeys.anthropicKey.includes('*') ? (
                                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">✓ Configurado</span>
                                    ) : apiKeys.anthropicKey.includes('*') ? (
                                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">✓ Salvo</span>
                                    ) : (
                                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">⚠ Não configurado</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showKeys.anthropic ? 'text' : 'password'}
                                            className="input w-full pr-10"
                                            placeholder="sk-ant-..."
                                            value={apiKeys.anthropicKey}
                                            onChange={(e) => setApiKeys({ ...apiKeys, anthropicKey: e.target.value })}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
                                            onClick={() => setShowKeys({ ...showKeys, anthropic: !showKeys.anthropic })}
                                        >
                                            {showKeys.anthropic ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    Obtenha sua chave em <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">console.anthropic.com</a>
                                </p>
                            </div>

                            {/* Google Gemini */}
                            <div className="p-4 border border-[var(--border-subtle)] rounded-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-lg">💎</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-white">Google Gemini</h3>
                                        <p className="text-xs text-[var(--text-muted)]">Gemini Pro, Flash - Contexto de 2M tokens</p>
                                    </div>
                                    {apiKeys.geminiKey && !apiKeys.geminiKey.includes('*') ? (
                                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">✓ Configurado</span>
                                    ) : apiKeys.geminiKey.includes('*') ? (
                                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">✓ Salvo</span>
                                    ) : (
                                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">⚠ Não configurado</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showKeys.gemini ? 'text' : 'password'}
                                            className="input w-full pr-10"
                                            placeholder="AIza..."
                                            value={apiKeys.geminiKey}
                                            onChange={(e) => setApiKeys({ ...apiKeys, geminiKey: e.target.value })}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
                                            onClick={() => setShowKeys({ ...showKeys, gemini: !showKeys.gemini })}
                                        >
                                            {showKeys.gemini ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    Obtenha sua chave em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">aistudio.google.com</a>
                                </p>
                            </div>

                            {/* Groq (Llama, Mixtral) */}
                            <div className="p-4 border border-[var(--border-subtle)] rounded-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-lg">⚡</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-white">Groq (Llama, Mixtral)</h3>
                                        <p className="text-xs text-[var(--text-muted)]">API ultra-rápida para Llama 3.3, Mixtral</p>
                                    </div>
                                    {apiKeys.groqKey && !apiKeys.groqKey.includes('*') ? (
                                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">✓ Configurado</span>
                                    ) : apiKeys.groqKey.includes('*') ? (
                                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">✓ Salvo</span>
                                    ) : (
                                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">⚠ Não configurado</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showKeys.groq ? 'text' : 'password'}
                                            className="input w-full pr-10"
                                            placeholder="gsk_..."
                                            value={apiKeys.groqKey}
                                            onChange={(e) => setApiKeys({ ...apiKeys, groqKey: e.target.value })}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
                                            onClick={() => setShowKeys({ ...showKeys, groq: !showKeys.groq })}
                                        >
                                            {showKeys.groq ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    Obtenha sua chave em <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">console.groq.com</a>
                                </p>
                            </div>

                            {/* ElevenLabs */}
                            <div className="p-4 border border-[var(--border-subtle)] rounded-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-lg">🎙️</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-white">ElevenLabs</h3>
                                        <p className="text-xs text-[var(--text-muted)]">Vozes AI Ultra-Realistas e Clonagem</p>
                                    </div>
                                    {apiKeys.elevenLabsKey && !apiKeys.elevenLabsKey.includes('*') ? (
                                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">✓ Configurado</span>
                                    ) : apiKeys.elevenLabsKey.includes('*') ? (
                                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">✓ Salvo</span>
                                    ) : (
                                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">⚠ Não configurado</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showKeys.elevenLabs ? 'text' : 'password'}
                                            className="input w-full pr-10"
                                            placeholder="sk_..."
                                            value={apiKeys.elevenLabsKey}
                                            onChange={(e) => setApiKeys({ ...apiKeys, elevenLabsKey: e.target.value })}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white"
                                            onClick={() => setShowKeys({ ...showKeys, elevenLabs: !showKeys.elevenLabs })}
                                        >
                                            {showKeys.elevenLabs ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    Obtenha sua chave em <a href="https://elevenlabs.io/app/api-keys" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">elevenlabs.io</a>
                                </p>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    className="btn btn-primary"
                                    onClick={saveApiKeys}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar API Keys'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="space-y-6">
                            <div className="glass p-6 rounded-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-white">Plano Atual</h2>
                                    <span className="badge badge-success">Ativo</span>
                                </div>

                                <div className="p-4 bg-gradient-to-r from-[var(--primary)]/20 to-[var(--secondary)]/20 rounded-xl border border-[var(--primary)]/30 mb-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">Professional</h3>
                                            <p className="text-[var(--text-muted)]">5 instâncias • 25.000 msgs/mês</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl font-bold text-white">R$ 299</span>
                                            <span className="text-[var(--text-muted)]">/mês</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-muted)]">Mensagens enviadas</span>
                                        <span className="font-medium">18.432 / 25.000</span>
                                    </div>
                                    <div className="progress">
                                        <div className="progress-bar" style={{ width: '73%' }} />
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-muted)]">Instâncias ativas</span>
                                        <span className="font-medium">3 / 5</span>
                                    </div>
                                </div>

                                <button className="btn btn-primary w-full">Fazer Upgrade</button>
                            </div>

                            <div className="glass p-6 rounded-xl">
                                <h2 className="text-xl font-semibold text-white mb-6">Método de Pagamento</h2>
                                <div className="flex items-center gap-4 p-4 border border-[var(--border-subtle)] rounded-lg">
                                    <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                                        VISA
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-white">•••• •••• •••• 4242</p>
                                        <p className="text-sm text-[var(--text-muted)]">Expira 12/2025</p>
                                    </div>
                                    <button className="text-[var(--primary)] hover:underline text-sm">Alterar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'api' && (
                        <div className="glass p-6 rounded-xl space-y-6">
                            <h2 className="text-xl font-semibold text-white">Chaves de API</h2>

                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                <p className="text-sm text-yellow-400">
                                    ⚠️ Nunca compartilhe suas chaves de API. Elas dão acesso total à sua conta.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">API Key</label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        className="input flex-1"
                                        defaultValue="sk_live_xxxxxxxxxxxxxxxxxxxxx"
                                        readOnly
                                        autoComplete="new-password"
                                    />
                                    <button className="btn btn-secondary">Copiar</button>
                                    <button className="btn btn-secondary text-red-400">Regenerar</button>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-[var(--border-subtle)]">
                                <h3 className="font-semibold text-white mb-4">Webhooks</h3>

                                <div>
                                    <label className="block text-sm font-medium mb-2">URL do Webhook</label>
                                    <input
                                        type="url"
                                        className="input w-full"
                                        placeholder="https://seu-servidor.com/webhook"
                                    />
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium mb-2">Eventos</label>
                                    <div className="space-y-2">
                                        {['message.sent', 'message.delivered', 'message.read', 'message.failed', 'instance.connected', 'instance.disconnected'].map((event) => (
                                            <label key={event} className="flex items-center gap-3">
                                                <input type="checkbox" className="rounded" defaultChecked />
                                                <code className="text-sm bg-[var(--bg-tertiary)] px-2 py-1 rounded">{event}</code>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <button className="btn btn-primary mt-4">Salvar Webhook</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="glass p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white">Membros da Equipe</h2>
                                <button className="btn btn-primary">
                                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Convidar
                                </button>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { name: 'João Silva', email: 'joao@empresa.com', role: 'owner', status: 'active' },
                                    { name: 'Maria Santos', email: 'maria@empresa.com', role: 'admin', status: 'active' },
                                    { name: 'Pedro Lima', email: 'pedro@empresa.com', role: 'member', status: 'pending' },
                                ].map((member, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 border border-[var(--border-subtle)] rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-semibold">
                                                {member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{member.name}</p>
                                                <p className="text-sm text-[var(--text-muted)]">{member.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`badge ${member.role === 'owner' ? 'badge-warning' :
                                                member.role === 'admin' ? 'badge-info' : 'badge-secondary'
                                                }`}>
                                                {member.role === 'owner' ? 'Proprietário' :
                                                    member.role === 'admin' ? 'Admin' : 'Membro'}
                                            </span>
                                            {member.status === 'pending' && (
                                                <span className="text-xs text-yellow-400">Convite pendente</span>
                                            )}
                                            {member.role !== 'owner' && (
                                                <button className="text-red-400 hover:text-red-300">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="glass p-6 rounded-xl">
                            <h2 className="text-xl font-semibold text-white mb-6">Preferências de Notificação</h2>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="font-medium text-white mb-3">Email</h3>
                                    <div className="space-y-3">
                                        <label className="flex items-center justify-between">
                                            <span className="text-[var(--text-secondary)]">Resumo diário de campanhas</span>
                                            <input type="checkbox" className="rounded" defaultChecked />
                                        </label>
                                        <label className="flex items-center justify-between">
                                            <span className="text-[var(--text-secondary)]">Alertas de instância desconectada</span>
                                            <input type="checkbox" className="rounded" defaultChecked />
                                        </label>
                                        <label className="flex items-center justify-between">
                                            <span className="text-[var(--text-secondary)]">Relatório semanal</span>
                                            <input type="checkbox" className="rounded" />
                                        </label>
                                        <label className="flex items-center justify-between">
                                            <span className="text-[var(--text-secondary)]">Novidades e atualizações</span>
                                            <input type="checkbox" className="rounded" defaultChecked />
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-[var(--border-subtle)]">
                                    <h3 className="font-medium text-white mb-3">Push (Navegador)</h3>
                                    <div className="space-y-3">
                                        <label className="flex items-center justify-between">
                                            <span className="text-[var(--text-secondary)]">Campanha concluída</span>
                                            <input type="checkbox" className="rounded" defaultChecked />
                                        </label>
                                        <label className="flex items-center justify-between">
                                            <span className="text-[var(--text-secondary)]">Erro crítico</span>
                                            <input type="checkbox" className="rounded" defaultChecked />
                                        </label>
                                        <label className="flex items-center justify-between">
                                            <span className="text-[var(--text-secondary)]">Limite de mensagens atingido</span>
                                            <input type="checkbox" className="rounded" defaultChecked />
                                        </label>
                                    </div>
                                </div>

                                <button className="btn btn-primary">Salvar Preferências</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
