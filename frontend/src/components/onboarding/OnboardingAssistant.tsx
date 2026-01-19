'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const TUTORIAL_MESSAGES: Record<string, string> = {
    '/': 'Olá! 👋 Este é o seu Dashboard. Aqui você monitora o resumo da sua operação, chips ativos e performance geral.',
    '/campaigns': '🚀 Pronto para decolar? Aqui você cria e gerencia suas campanhas de disparo em massa. Não esqueça de configurar o Anti-Ban!',
    '/campaigns/new': 'Lembre-se de usar variações de mensagem e delays seguros para proteger seus chips!',
    '/flows': 'Crie fluxos de conversa inteligentes aqui. Use o editor visual para conectar blocos de mensagem e IA.',
    '/chips': 'Gerencie seus números de WhatsApp. Mantenha o Health Score alto para evitar banimentos.',
    '/antiban': '🛡️ Área Crítica! Monitore a saúde dos seus chips e veja alertas de bloqueio em tempo real.',
    '/configuracoes': 'Configure suas chaves de API (OpenAI, Evolution) e preferências da conta aqui.',
    '/templates-meta': 'Gerencie seus templates oficiais do WhatsApp Business API (WABA) aqui.',
    '/warmup': 'Acompanhe o processo de aquecimento dos seus chips novos para garantir longevidade.',
};

export function OnboardingAssistant() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const msg = TUTORIAL_MESSAGES[pathname];
        if (msg) {
            setMessage(msg);
            // Auto open on route change after a small delay
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        } else {
            setIsOpen(false);
            setMessage('');
        }
    }, [pathname]);

    if (!message && !isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-none">
            {/* Bubble */}
            <div
                className={`
                    transition-all duration-300 ease-in-out transform origin-bottom-right pointer-events-auto
                    bg-white/95 dark:bg-gray-900/95 backdrop-blur-md 
                    border border-purple-500/30 p-4 rounded-2xl shadow-2xl max-w-sm
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4 pointer-events-none'}
                `}
            >
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">IA Guide</span>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        aria-label="Minimizar guia"
                    >
                        ✕
                    </button>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                    {message}
                </p>

                {/* Seta da bolha */}
                <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white/95 dark:bg-gray-900/95 rotate-45 border-b border-r border-purple-500/30"></div>
            </div>

            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 rounded-full overflow-hidden outline-none focus:outline-none pointer-events-auto relative group transition-transform hover:scale-110 active:scale-95 z-[9999]"
                aria-label="Abrir guia de IA"
            >
                <img
                    src="/images/ai-agent-v2.png"
                    alt="AI Agent"
                    className="w-full h-full object-cover transform scale-110"
                />
            </button>
        </div>
    );
}
