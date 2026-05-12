'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Bot,
    LineChart,
    Users,
    Zap,
    ArrowRight,
    CheckCircle2,
    XCircle,
    Smartphone,
    Monitor,
    Workflow,
    Database,
    PhoneForwarded,
    Sparkles,
    BarChart3,
    Megaphone,
    Layers,
    Target
} from 'lucide-react';
import Link from 'next/link';

// Componentes Reutilizáveis
const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl ${className}`}>
        {children}
    </div>
);

const GradientText = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <span className={`bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-amber-300 ${className}`}>
        {children}
    </span>
);

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#030305] text-white overflow-x-hidden selection:bg-purple-500/30">
            {/* Background effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[50%] h-[30%] bg-amber-500/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <Navbar />

            <main className="relative z-10">
                <HeroSection />
                <DesktopMobileSection />
                <CoreSphereSection />
                <FeatureCardsSection />
                <TimelineSection />
                <BeforeAfterSection />
                <FinalCTA />
            </main>
        </div>
    );
}

function Navbar() {
    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md border-b border-white/5 bg-[#030305]/60"
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Multverso</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
                    <a href="#plataforma" className="hover:text-white transition-colors">Plataforma</a>
                    <a href="#recursos" className="hover:text-white transition-colors">Recursos</a>
                    <a href="#comparativo" className="hover:text-white transition-colors">Comparativo</a>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Login</Link>
                    <button className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        Agendar Demo
                    </button>
                </div>
            </div>
        </motion.nav>
    );
}

function HeroSection() {
    return (
        <section className="pt-40 pb-20 px-6 overflow-hidden relative">
            <div className="max-w-7xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium mb-8"
                >
                    <Sparkles className="w-4 h-4" />
                    <span>A Central de Comando da sua Operação</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]"
                >
                    O cérebro da sua <br className="hidden md:block" />
                    <GradientText>máquina de vendas.</GradientText>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed"
                >
                    Conecte WhatsApp, IA, CRM e equipe em uma única plataforma premium. Deixe a inteligência artificial trabalhar enquanto você escala.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
                >
                    <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-lg hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all duration-300 hover:scale-105">
                        Ver Demonstração
                    </button>
                    <button className="w-full sm:w-auto px-8 py-4 rounded-full border border-white/10 bg-white/5 text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300">
                        Falar com Consultor
                    </button>
                </motion.div>

                {/* Dashboard Mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 100, rotateX: 20 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 1.2, delay: 0.4, type: "spring" }}
                    style={{ perspective: 1000 }}
                    className="relative max-w-5xl mx-auto"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-transparent blur-3xl -z-10 rounded-full" />
                    <GlassCard className="p-4 md:p-6 border-t-white/20 relative overflow-hidden group">
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:animate-[shimmer_2s_infinite]" />
                        
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            </div>
                            <div className="mx-auto px-4 py-1 rounded-md bg-white/5 text-xs text-gray-400 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                multverso.app/dashboard
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-4 md:gap-6 text-left">
                            {/* Sidebar Sim */}
                            <div className="col-span-3 hidden md:flex flex-col gap-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="h-10 rounded-lg bg-white/5 w-full" />
                                ))}
                                <div className="mt-auto h-24 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 p-4">
                                    <div className="h-4 w-20 bg-white/20 rounded mb-2" />
                                    <div className="h-8 w-16 bg-white/40 rounded" />
                                </div>
                            </div>
                            
                            {/* Main Area */}
                            <div className="col-span-12 md:col-span-9 space-y-4 md:space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="h-28 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-between">
                                        <MessageSquare className="w-5 h-5 text-blue-400" />
                                        <div>
                                            <div className="text-2xl font-bold">1,284</div>
                                            <div className="text-xs text-gray-400">Conversas Ativas</div>
                                        </div>
                                    </div>
                                    <div className="h-28 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-4 flex flex-col justify-between relative overflow-hidden">
                                        <Bot className="w-5 h-5 text-purple-400" />
                                        <div>
                                            <div className="text-2xl font-bold">IA Ativa</div>
                                            <div className="text-xs text-purple-300">Qualificando Leads</div>
                                        </div>
                                        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-purple-500/30 blur-xl rounded-full animate-pulse" />
                                    </div>
                                    <div className="h-28 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-between">
                                        <LineChart className="w-5 h-5 text-emerald-400" />
                                        <div>
                                            <div className="text-2xl font-bold">R$ 45k</div>
                                            <div className="text-xs text-gray-400">Pipeline de Vendas</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="h-64 rounded-xl bg-white/5 border border-white/5 p-4">
                                        <div className="h-4 w-32 bg-white/10 rounded mb-6" />
                                        <div className="space-y-3">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                                                    <div className="w-8 h-8 rounded-full bg-white/10" />
                                                    <div className="flex-1">
                                                        <div className="h-3 w-24 bg-white/20 rounded mb-1" />
                                                        <div className="h-2 w-32 bg-white/10 rounded" />
                                                    </div>
                                                    <div className="w-16 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                                        <span className="text-[10px] text-amber-300">Quente</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="h-64 rounded-xl bg-white/5 border border-white/5 p-4 flex items-end justify-between">
                                        {/* Fake Chart Bars */}
                                        {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                                            <motion.div 
                                                key={i}
                                                initial={{ height: 0 }}
                                                whileInView={{ height: `${h}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1, delay: i * 0.1 }}
                                                className={`w-[10%] rounded-t-sm ${i === 6 ? 'bg-gradient-to-t from-purple-500 to-blue-500' : 'bg-white/10'}`} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating elements to give depth */}
                        <motion.div 
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -right-6 -top-6 bg-gray-900 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-xl"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold">+12 Leads</div>
                                    <div className="text-xs text-gray-400">Últimos 5 min</div>
                                </div>
                            </div>
                        </motion.div>
                    </GlassCard>
                </motion.div>
            </div>
        </section>
    );
}

function DesktopMobileSection() {
    return (
        <section id="plataforma" className="py-24 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">
                            Sua equipe no <span className="text-blue-400">Desktop</span>.<br />
                            Seu cliente no <span className="text-green-400">WhatsApp</span>.
                        </h2>
                        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                            O cliente conversa de forma natural no WhatsApp ou Instagram. Enquanto isso, sua empresa gerencia tudo através de um painel de controle profissional, com funis, histórico e integrações completas.
                        </p>
                        <ul className="space-y-4">
                            {[
                                "Conversas centralizadas em tempo real",
                                "Histórico unificado (WhatsApp + Insta)",
                                "Distribuição inteligente para vendedores",
                                "Anotações e tags invisíveis pro cliente"
                            ].map((text, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                    <span className="text-gray-300">{text}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <div className="relative h-[500px]">
                        {/* Desktop Mockup */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="absolute right-0 top-0 w-[120%] md:w-full h-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="h-8 bg-black/50 border-b border-white/5 flex items-center px-4 gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            </div>
                            <div className="p-6 flex gap-6 h-full">
                                <div className="w-64 bg-white/5 rounded-xl hidden md:block">
                                    {/* CRM Column Sim */}
                                    <div className="p-4 border-b border-white/5">
                                        <div className="h-4 w-24 bg-white/20 rounded" />
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {[1,2,3,4].map(i => <div key={i} className="h-12 w-full bg-white/5 rounded-lg" />)}
                                    </div>
                                </div>
                                <div className="flex-1 bg-white/5 rounded-xl relative p-6">
                                    {/* Chat Area Sim */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-30">
                                        <Monitor className="w-16 h-16 mx-auto mb-2" />
                                        <span className="text-sm font-medium">Multverso Workspace</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Mobile Mockup */}
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="absolute -left-4 -bottom-8 w-64 h-[450px] bg-gray-900 border-4 border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl z-10"
                        >
                            <div className="absolute top-0 w-full h-6 bg-black flex justify-center z-20">
                                <div className="w-24 h-4 bg-gray-800 rounded-b-xl" />
                            </div>
                            <div className="bg-[#0b141a] h-full flex flex-col pt-6">
                                <div className="bg-[#202c33] p-3 flex items-center gap-3 shadow-md">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500" />
                                    <div>
                                        <div className="text-white font-medium text-sm">Empresa Premium</div>
                                        <div className="text-gray-400 text-xs">online</div>
                                    </div>
                                </div>
                                <div className="flex-1 bg-[#0b141a] p-4 flex flex-col gap-3 justify-end pb-10">
                                    <div className="self-end bg-[#005c4b] text-white p-2 rounded-lg rounded-tr-none max-w-[80%] text-sm">
                                        Olá, gostaria de saber mais.
                                    </div>
                                    <div className="self-start bg-[#202c33] text-white p-2 rounded-lg rounded-tl-none max-w-[80%] text-sm relative">
                                        <span className="absolute -top-3 -left-2 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500 items-center justify-center"><Bot className="w-2.5 h-2.5 text-white" /></span>
                                        </span>
                                        Olá! Claro, me conta o que você procura hoje?
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Connection Lines */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))' }}>
                            <motion.path
                                d="M 120 200 C 200 200, 250 150, 350 150"
                                fill="transparent"
                                stroke="url(#gradient)"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                initial={{ pathLength: 0 }}
                                whileInView={{ pathLength: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                            />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#8B5CF6" />
                                    <stop offset="100%" stopColor="#3B82F6" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
            </div>
        </section>
    );
}

function CoreSphereSection() {
    return (
        <section className="py-32 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 text-center">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">
                    Tudo conectado em um <GradientText>único cérebro</GradientText>.
                </h2>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-20">
                    Elimine ferramentas soltas. O Multverso conecta seus canais de aquisição, inteligência e gestão em um ecossistema perfeito.
                </p>

                <div className="relative h-[600px] flex items-center justify-center">
                    {/* Background glow */}
                    <div className="absolute inset-0 bg-purple-900/10 rounded-full blur-[100px]" />
                    
                    {/* Center Core */}
                    <motion.div 
                        animate={{ 
                            boxShadow: ['0 0 40px rgba(139,92,246,0.3)', '0 0 80px rgba(139,92,246,0.6)', '0 0 40px rgba(139,92,246,0.3)']
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="relative z-10 w-40 h-40 rounded-full bg-gradient-to-br from-gray-900 to-black border-2 border-purple-500/50 flex flex-col items-center justify-center"
                    >
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600/20 to-blue-600/20 mix-blend-screen" />
                        <Layers className="w-12 h-12 text-white mb-2" />
                        <span className="font-bold text-sm tracking-widest">MULTVERSO</span>
                    </motion.div>

                    {/* Orbiting Elements */}
                    {[
                        { icon: MessageSquare, label: 'WhatsApp', color: 'text-green-400', border: 'border-green-500/30' },
                        { icon: Smartphone, label: 'Instagram', color: 'text-pink-400', border: 'border-pink-500/30' },
                        { icon: Bot, label: 'IA Agents', color: 'text-purple-400', border: 'border-purple-500/30' },
                        { icon: Database, label: 'CRM', color: 'text-blue-400', border: 'border-blue-500/30' },
                        { icon: Megaphone, label: 'Campanhas', color: 'text-amber-400', border: 'border-amber-500/30' },
                        { icon: LineChart, label: 'Dashboard', color: 'text-emerald-400', border: 'border-emerald-500/30' },
                        { icon: Workflow, label: 'Automação', color: 'text-orange-400', border: 'border-orange-500/30' },
                        { icon: Users, label: 'Equipe', color: 'text-cyan-400', border: 'border-cyan-500/30' },
                    ].map((item, index) => {
                        const angle = (index / 8) * Math.PI * 2;
                        const radius = 220; // px
                        return (
                            <motion.div
                                key={item.label}
                                initial={{ opacity: 0, scale: 0 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.5, type: "spring" }}
                                className="absolute"
                                style={{
                                    left: `calc(50% + ${Math.cos(angle) * radius}px)`,
                                    top: `calc(50% + ${Math.sin(angle) * radius}px)`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                <GlassCard className={`p-4 flex flex-col items-center gap-2 w-28 hover:scale-110 transition-transform cursor-pointer ${item.border}`}>
                                    <item.icon className={`w-6 h-6 ${item.color}`} />
                                    <span className="text-xs font-medium text-gray-300">{item.label}</span>
                                </GlassCard>
                            </motion.div>
                        );
                    })}

                    {/* SVG Connecting Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                        {[0,1,2,3,4,5,6,7].map(i => {
                            const angle = (i / 8) * Math.PI * 2;
                            const r = 220;
                            return (
                                <line 
                                    key={i}
                                    x1="50%" y1="50%" 
                                    x2={`calc(50% + ${Math.cos(angle) * r}px)`} 
                                    y2={`calc(50% + ${Math.sin(angle) * r}px)`} 
                                    stroke="currentColor" 
                                    className="text-purple-400"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                />
                            );
                        })}
                    </svg>
                </div>
            </div>
        </section>
    );
}

function FeatureCardsSection() {
    const features = [
        {
            title: "Agentes de IA Nativos",
            desc: "Treine IAs para qualificar, responder dúvidas e agendar reuniões 24/7.",
            icon: Bot,
            ui: (
                <div className="space-y-2 mt-4 bg-black/40 p-3 rounded-lg border border-white/5">
                    <div className="bg-white/10 p-2 rounded max-w-[80%] text-xs text-gray-300">Quais são os planos?</div>
                    <div className="bg-purple-500/20 border border-purple-500/30 p-2 rounded max-w-[90%] self-end ml-auto text-xs text-purple-100 flex gap-1">
                        <Bot className="w-3 h-3 mt-0.5 text-purple-400 shrink-0" />
                        Temos 3 planos. Notei que sua empresa é B2B, recomendo o plano Pro. Quer agendar uma call?
                    </div>
                </div>
            )
        },
        {
            title: "CRM Visual e Ágil",
            desc: "Arraste cards, gerencie funis e nunca mais perca o timing de uma negociação.",
            icon: Database,
            ui: (
                <div className="flex gap-2 mt-4 overflow-hidden h-24">
                    <div className="flex-1 bg-white/5 rounded p-2">
                        <div className="text-[10px] text-gray-500 mb-2">Novos</div>
                        <div className="bg-white/10 h-6 rounded mb-1" />
                        <div className="bg-white/10 h-6 rounded" />
                    </div>
                    <div className="flex-1 bg-white/5 rounded p-2 border border-blue-500/30 bg-blue-500/5">
                        <div className="text-[10px] text-blue-400 mb-2">Em Demo</div>
                        <div className="bg-blue-500/20 border border-blue-500/40 h-6 rounded mb-1 shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                    </div>
                </div>
            )
        },
        {
            title: "Campanhas que Convertem",
            desc: "Dispare mensagens em massa segmentadas e acompanhe métricas de entrega.",
            icon: Megaphone,
            ui: (
                <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Black Friday - Lote 1</span>
                        <span className="text-green-400">98% Entregue</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 w-[98%]" />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                        <span>Enviados: 1.200</span>
                        <span>Lidos: 980</span>
                    </div>
                </div>
            )
        },
        {
            title: "Distribuição Inteligente",
            desc: "Roteie leads automaticamente para o vendedor certo baseado em regras.",
            icon: Workflow,
            ui: (
                <div className="mt-4 flex flex-col items-center justify-center h-24 relative">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center z-10">
                        <Target className="w-4 h-4 text-amber-400" />
                    </div>
                    <svg className="absolute w-full h-full opacity-50">
                        <path d="M 50% 50% L 20% 80%" stroke="#4ade80" strokeWidth="2" strokeDasharray="3 3" />
                        <path d="M 50% 50% L 80% 80%" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3 3" />
                    </svg>
                    <div className="flex w-full justify-between px-4 mt-6 z-10">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/50" />
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50" />
                    </div>
                </div>
            )
        }
    ];

    return (
        <section id="recursos" className="py-24 relative z-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">Poder <GradientText>Enterprise</GradientText>,<br/>Uso Intuitivo.</h2>
                    <p className="text-gray-400 text-lg">Cada funcionalidade foi desenhada para velocidade e escala.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <GlassCard className="p-6 h-full flex flex-col group hover:bg-white/[0.05] transition-colors border-t-white/10">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <feat.icon className="w-5 h-5 text-gray-300 group-hover:text-white" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                                <p className="text-sm text-gray-400 mb-6 flex-1">{feat.desc}</p>
                                
                                <div className="mt-auto border-t border-white/5 pt-4">
                                    {feat.ui}
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function TimelineSection() {
    const steps = [
        { title: "Anúncio", icon: Megaphone },
        { title: "WhatsApp", icon: MessageSquare },
        { title: "Qualificação IA", icon: Bot },
        { title: "CRM", icon: Database },
        { title: "Vendedor", icon: PhoneForwarded },
        { title: "Venda", icon: Target },
    ];

    return (
        <section className="py-24 bg-black/40 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4">A jornada perfeita do Lead</h2>
                    <p className="text-gray-400">Automatizada de ponta a ponta sem perder o toque humano.</p>
                </div>

                <div className="relative overflow-x-auto pb-8 hide-scrollbar">
                    <div className="flex items-center min-w-max px-4">
                        {steps.map((step, i) => (
                            <div key={i} className="flex items-center">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={{ delay: i * 0.1 }}
                                    className="relative flex flex-col items-center group"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:border-purple-500/50 group-hover:bg-purple-500/10 transition-all z-10 relative">
                                        <step.icon className="w-6 h-6 text-gray-400 group-hover:text-purple-400" />
                                        <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">{step.title}</span>
                                </motion.div>

                                {i < steps.length - 1 && (
                                    <div className="w-24 md:w-32 h-1 mx-2 relative overflow-hidden bg-white/5 rounded-full">
                                        <motion.div 
                                            initial={{ x: "-100%" }}
                                            whileInView={{ x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                                            className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500" 
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function BeforeAfterSection() {
    return (
        <section id="comparativo" className="py-24 relative">
            <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">
                    Por que mudar para o Multverso?
                </h2>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Before */}
                    <GlassCard className="p-8 border-red-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <XCircle className="w-32 h-32" />
                        </div>
                        <h3 className="text-2xl font-bold text-red-400 mb-6 flex items-center gap-2">
                            <XCircle className="w-6 h-6" /> O Caos (Sem Multverso)
                        </h3>
                        <ul className="space-y-4">
                            {[
                                "Conversas perdidas em celulares pessoais",
                                "Vendedores gastando horas com leads desqualificados",
                                "Planilhas desatualizadas e CRM abandonado",
                                "Zero visibilidade sobre métricas reais",
                                "Clientes esperando horas por uma resposta"
                            ].map((text, i) => (
                                <li key={i} className="flex items-start gap-3 text-gray-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                    <span>{text}</span>
                                </li>
                            ))}
                        </ul>
                        
                        <div className="mt-8 p-4 bg-red-500/5 border border-red-500/10 rounded-lg grayscale opacity-50">
                            <div className="h-4 w-1/2 bg-white/10 rounded mb-2" />
                            <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
                            <div className="h-4 w-2/3 bg-white/10 rounded" />
                        </div>
                    </GlassCard>

                    {/* After */}
                    <GlassCard className="p-8 border-purple-500/30 relative overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.1)]">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <CheckCircle2 className="w-32 h-32" />
                        </div>
                        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-6 flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-purple-400" /> A Máquina (Com Multverso)
                        </h3>
                        <ul className="space-y-4">
                            {[
                                "Painel único para toda a operação comercial",
                                "IA qualifica leads e agenda 24/7",
                                "Funil de vendas visual integrado ao chat",
                                "Dashboards precisos de ROI e performance",
                                "Atendimento imediato e roteamento inteligente"
                            ].map((text, i) => (
                                <li key={i} className="flex items-start gap-3 text-gray-200">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                                    <span>{text}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-8 p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
                            <div className="flex gap-2 mb-3">
                                <div className="h-2 w-12 bg-green-400 rounded-full" />
                                <div className="h-2 w-24 bg-white/20 rounded-full" />
                            </div>
                            <div className="flex gap-2 mb-3">
                                <div className="h-2 w-12 bg-blue-400 rounded-full" />
                                <div className="h-2 w-32 bg-white/20 rounded-full" />
                            </div>
                            <div className="flex gap-2">
                                <div className="h-2 w-12 bg-purple-400 rounded-full" />
                                <div className="h-2 w-16 bg-white/20 rounded-full" />
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </section>
    );
}

function FinalCTA() {
    return (
        <section className="py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-black z-0" />
            
            {/* Cinematic Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-purple-600/40 via-blue-600/40 to-emerald-600/40 blur-[150px] rounded-full z-0 opacity-50" />
            
            <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-8 text-white">
                        Pronto para plugar o cérebro na sua operação?
                    </h2>
                    <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
                        Junte-se às empresas que pararam de perder vendas por desorganização. Comece a escalar hoje.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <button className="group relative px-8 py-4 rounded-full bg-white text-black font-bold text-lg overflow-hidden">
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-200 to-blue-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="relative flex items-center justify-center gap-2">
                                Solicitar Acesso <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </div>
                </motion.div>
            </div>
            
            {/* Bottom grid lines */}
            <div className="absolute bottom-0 w-full h-32 bg-[url('/grid.svg')] bg-repeat-x opacity-20" style={{ maskImage: 'linear-gradient(to top, black, transparent)' }} />
        </section>
    );
}
