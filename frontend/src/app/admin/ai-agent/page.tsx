'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function AiAgentConfigPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isLoading && user?.role !== 'super_admin') {
            router.push('/');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        // Carregar prompt salvo (simulação)
        const saved = localStorage.getItem('ai_agent_prompt');
        setPrompt(saved || 'Você é um assistente especialista em Marketing Digital e automação via WhatsApp. Ajude o usuário a configurar campanhas, criar fluxos e evitar banimentos.');
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 800));

        localStorage.setItem('ai_agent_prompt', prompt);
        setIsSaving(false);
        // Toast ou Alert seria melhor, mas alert nativo serve por hora
        alert('Configurações do Agente salvas com sucesso!');
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;
    if (user?.role !== 'super_admin') return null;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">Configuração do Agente IA</h1>
                <p className="text-gray-400">Defina a personalidade e as regras de comportamento do seu assistente virtual.</p>
            </header>

            <div className="grid gap-6">
                {/* Card de Prompt */}
                <div className="bg-[#1e2330] p-6 rounded-xl border border-gray-700 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-lg font-medium text-white flex items-center gap-2">
                            🧠 System Prompt
                        </label>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                            Ativo
                        </span>
                    </div>

                    <p className="text-sm text-gray-500 mb-4 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                        ℹ️ Este prompt define a "alma" do agente. Inclua diretrizes sobre tom de voz, o que ele pode ou não fazer, e contexto sobre o WhatSaas.
                    </p>

                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-80 bg-gray-900 text-gray-200 p-4 rounded-lg border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none font-mono text-sm leading-relaxed resize-y placeholder-gray-600"
                        placeholder="Ex: Você é um assistente útil..."
                    />

                    <div className="mt-6 flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                            Última alteração: {new Date().toLocaleDateString()}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPrompt('Você é um assistente especialista em Marketing Digital e automação via WhatsApp.')}
                                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm"
                            >
                                Restaurar Padrão
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`
                                    px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg 
                                    hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/20 font-medium 
                                    transition-all transform active:scale-95 flex items-center gap-2
                                    ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}
                                `}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar Configuração'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Card de Aparência (Mock) */}
                <div className="bg-[#1e2330] p-6 rounded-xl border border-gray-700 shadow-xl opacity-60">
                    <h3 className="text-lg font-medium text-white mb-4">Aparência (Em breve)</h3>
                    <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-purple-500 flex items-center justify-center">
                            🤖
                        </div>
                        <div className="text-sm text-gray-400">
                            A personalização do avatar e cores do widget estará disponível na próxima versão.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
