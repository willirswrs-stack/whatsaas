'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import api from '@/lib/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function SupportWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const dragControls = useDragControls();
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Olá! Sou o assistente de suporte virtual do WhatSaas. 🤖\n\nPosso tirar dúvidas sobre Chips/Conexões, Campanhas, Aquecimento, Anti-Ban ou Fluxos. Como posso te ajudar hoje?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e?: React.FormEvent, customText?: string) => {
        if (e) e.preventDefault();
        const textToSend = (customText || input).trim();
        if (!textToSend || isSending) return;

        setInput('');
        
        // Append user message
        const updatedMessages = [...messages, { role: 'user', content: textToSend } as Message];
        setMessages(updatedMessages);
        setIsSending(true);

        try {
            const res = await api.post('/ai/support-chat', {
                message: textToSend,
                // Send history for context
                history: updatedMessages.slice(0, -1).map(m => ({
                    role: m.role,
                    content: m.content
                }))
            });

            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Desculpe, ocorreu um erro de conexão. Se preferir falar diretamente com suporte humano, clique aqui: https://wa.me/5562981952897?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20WhatSaas.'
                }
            ]);
        } finally {
            setIsSending(false);
        }
    };

    // Helper to render text with clickable links or cards
    const renderMessageContent = (content: string) => {
        const whatsappRegex = /(https:\/\/wa\.me\/[^\s]+)/gi;
        const parts = content.split(whatsappRegex);

        return (
            <div className="space-y-3">
                <div 
                    className="whitespace-pre-wrap text-sm leading-relaxed font-medium" 
                    style={{ color: 'var(--text-primary)' }}
                >
                    {parts.map((part, index) => {
                        if (part.match(whatsappRegex)) {
                            // Extract only path and query parameters cleanly
                            return (
                                <a
                                    key={index}
                                    href={part}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--accent-primary)] hover:underline break-all inline-flex items-center gap-1 font-semibold"
                                >
                                    Falar no WhatsApp ↗
                                </a>
                            );
                        }
                        return part;
                    })}
                </div>
                {/* If it contains whatsapp link, render a beautiful shortcut button */}
                {content.includes('wa.me') && (
                    <a
                        href="https://wa.me/5562981952897?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20WhatSaas."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md hover:scale-[1.02] border border-green-400/20"
                    >
                        <MessageCircle size={18} />
                        Chamar Suporte Humano
                    </a>
                )}
            </div>
        );
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
            <div className="pointer-events-auto flex flex-col items-end relative">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            drag
                            dragControls={dragControls}
                            dragListener={false}
                            dragMomentum={false}
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            className="glass border border-[var(--border-color)] rounded-2xl shadow-2xl w-[360px] h-[500px] mb-4 overflow-hidden flex flex-col absolute bottom-16 right-0"
                        >
                            {/* Header */}
                            <div 
                                onPointerDown={(e) => dragControls.start(e)}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center shadow-md cursor-grab active:cursor-grabbing"
                            >
                                <div className="flex items-center gap-3 pointer-events-none">
                                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg">🤖</div>
                                    <div>
                                        <h3 className="font-bold text-sm leading-tight text-white">Suporte Inteligente</h3>
                                        <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                            Assistente IA ativo
                                        </p>
                                    </div>
                                </div>
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors text-white z-10">
                                    <X size={18} />
                                </button>
                            </div>

                        {/* Body (Message list) */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/20">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                                            msg.role === 'user'
                                                ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-br-none'
                                                : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-bl-none'
                                        }`}
                                    >
                                        {renderMessageContent(msg.content)}
                                    </div>
                                </div>
                            ))}
                            {isSending && (
                                <div className="flex justify-start">
                                    <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin text-[var(--accent-primary)]" />
                                        <span className="text-xs text-[var(--text-muted)]">Pensando...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Action bar */}
                        <div className="px-4 py-2 bg-[var(--bg-tertiary)]/50 border-t border-[var(--border-color)] flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
                            <button
                                type="button"
                                onClick={() => handleSend(undefined, 'Como conectar um chip no WhatsApp?')}
                                className="text-[11px] px-2.5 py-1.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                            >
                                Conectar Chip 🔌
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSend(undefined, 'Como criar campanhas e evitar banimento?')}
                                className="text-[11px] px-2.5 py-1.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                            >
                                Evitar Banimento 🛡️
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSend(undefined, 'Quero falar com o suporte humano no WhatsApp')}
                                className="text-[11px] px-2.5 py-1.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                            >
                                Suporte Humano 📞
                            </button>
                        </div>

                        {/* Input Footer */}
                        <form onSubmit={handleSend} className="p-3 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)] flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Digite sua dúvida aqui..."
                                className="input flex-1 py-2 text-sm"
                                disabled={isSending}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isSending}
                                className="btn btn-primary p-2 h-10 w-10 flex items-center justify-center shrink-0"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300
                    ${isOpen ? 'bg-slate-200 dark:bg-slate-800 text-slate-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:scale-110 hover:rotate-12'}
                `}
            >
                {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
            </button>
            </div>
        </div>
    );
}
