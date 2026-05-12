'use client';

import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SupportWidget() {
    const [isOpen, setIsOpen] = useState(false);

    const supportPhone = "5511999999999"; // Replace with real support number
    const supportMessage = encodeURIComponent("Olá! Preciso de ajuda com o WhatSaas.");
    const whatsappUrl = `https://wa.me/${supportPhone}?text=${supportMessage}`;

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-80 mb-4 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-bold">Suporte WhatSaas</h3>
                                <p className="text-xs opacity-80">Estamos online agora</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Olá! Como podemos ajudar você hoje? 
                                Clique no botão abaixo para falar com um especialista via WhatsApp.
                            </p>
                            
                            <a 
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-500/20"
                            >
                                <MessageCircle size={20} />
                                Abrir WhatsApp
                            </a>
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                            <p className="text-[10px] text-slate-400">Resposta média: 5 min</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300
                    ${isOpen ? 'bg-slate-200 dark:bg-slate-800 text-slate-600' : 'bg-blue-600 text-white hover:scale-110 hover:rotate-12'}
                `}
            >
                {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
            </button>
        </div>
    );
}
