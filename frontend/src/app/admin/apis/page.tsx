'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import SwaggerViewer from '@/components/SwaggerViewer';

export default function AdminApisPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [settings, setSettings] = useState({
        evolutionUrl: '',
        evolutionKey: '',
        openaiKey: '',
        elevenlabsKey: '',
        webhookUrl: ''
    });
    const [swaggerUrl, setSwaggerUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setSwaggerUrl(`http://${window.location.hostname}:3333/docs`);
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        if (user.role !== 'super_admin') {
            router.push('/dashboard');
            return;
        }
        loadSettings();
    }, [user, router]);

    const loadSettings = async () => {
        try {
            const { data } = await api.get('/admin/apis');
            setSettings({
                evolutionUrl: data.evolutionUrl || '',
                evolutionKey: data.evolutionKey || '',
                openaiKey: data.openaiKey || '',
                elevenlabsKey: data.elevenlabsKey || '',
                webhookUrl: data.webhookUrl || ''
            });
        } catch (err) {
            console.error('Falha ao carregar configurações de API', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await api.patch('/admin/apis', settings);
            alert('✅ Configurações de API salvas com sucesso!');
            loadSettings(); // Recarrega para mostrar mascarado
        } catch (err) {
            alert('Erro ao salvar as configurações.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--bg-background)] overflow-y-auto">
            <header className="shrink-0 h-20 px-8 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card)]">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <span className="text-purple-400">🔌</span> APIs e Integrações Globais
                    </h1>
                    <p className="text-sm text-[var(--text-muted)]">Configure chaves e endpoints utilizados por todos os clientes do sistema.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                    {isSaving ? 'Salvando...' : '💾 Salvar Configurações'}
                </button>
            </header>

            <main className="flex-1 p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* EVOLUTION API */}
                    <div className="glass-card border border-[var(--border-color)] p-6 relative overflow-hidden rounded-2xl">
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-green-600"></div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            📱 Evolution API (WhatsApp)
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">URL Base do Evolution</label>
                                <input
                                    type="text"
                                    value={settings.evolutionUrl}
                                    onChange={(e) => setSettings({...settings, evolutionUrl: e.target.value})}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-3 text-sm focus:border-primary outline-none transition-colors font-mono"
                                    placeholder="http://localhost:8081"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Global API Key</label>
                                <input
                                    type="text"
                                    value={settings.evolutionKey}
                                    onChange={(e) => setSettings({...settings, evolutionKey: e.target.value})}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-3 text-sm focus:border-primary outline-none transition-colors font-mono"
                                    placeholder="Cole a chave global do evolution..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">URL Base de Webhooks (Este Servidor)</label>
                                <input
                                    type="text"
                                    value={settings.webhookUrl}
                                    onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-3 text-sm focus:border-primary outline-none transition-colors font-mono"
                                    placeholder="http://seu-dominio.com/api/v1/evolution/webhook"
                                />
                            </div>
                        </div>
                    </div>

                    {/* OPENAI */}
                    <div className="glass-card border border-[var(--border-color)] p-6 relative overflow-hidden rounded-2xl">
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-slate-400 to-slate-600"></div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            🧠 OpenAI (ChatGPT / Spinner)
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">OpenAI API Key (sk-...)</label>
                                <input
                                    type="text"
                                    value={settings.openaiKey}
                                    onChange={(e) => setSettings({...settings, openaiKey: e.target.value})}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-3 text-sm focus:border-primary outline-none transition-colors font-mono"
                                    placeholder="sk-proj-..."
                                />
                                <p className="text-[10px] text-[var(--text-muted)] mt-2">
                                    Usada para processar Fluxos Inteligentes e rotacionar mensagens com o Spinner.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ELEVENLABS */}
                    <div className="glass-card border border-[var(--border-color)] p-6 relative overflow-hidden rounded-2xl">
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-400 to-purple-600"></div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            🎙️ ElevenLabs (Voz IA)
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ElevenLabs API Key</label>
                                <input
                                    type="text"
                                    value={settings.elevenlabsKey}
                                    onChange={(e) => setSettings({...settings, elevenlabsKey: e.target.value})}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-3 text-sm focus:border-primary outline-none transition-colors font-mono"
                                    placeholder="Sua chave..."
                                />
                                <p className="text-[10px] text-[var(--text-muted)] mt-2">
                                    Necessária para criar vozes clonadas personalizadas ou usar a tecnologia de TTS HD nativa.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* NATIVE API DOCS */}
                    <div className="lg:col-span-2 mt-8">
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
                            <span className="text-blue-400">📚</span> Referência Completa da API
                        </h2>
                        
                        {swaggerUrl ? (
                            <SwaggerViewer docsUrl={swaggerUrl + '-json'} />
                        ) : (
                            <div className="text-gray-500 flex items-center gap-2 animate-pulse p-4 bg-black/20 rounded-xl">Buscando rotas do servidor...</div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
