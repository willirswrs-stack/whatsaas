'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Plan {
    id: string;
    name: string;
    maxInstances: number;
    price: number;
    billingCycle: string;
}

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [cycle, setCycle] = useState<string>('MONTHLY');
    const [loading, setLoading] = useState(true);

    const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await api.get('/billing/plans');
            setPlans(res.data);
        } catch (err) {
            toast.error('Erro ao baixar lista de planos do servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkoutPlan) return;
        
        if (!cpfCnpj || cpfCnpj.length < 11) {
            toast.error('Informe um CPF/CNPJ válido.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.post('/billing/subscribe', {
                planId: checkoutPlan.id,
                cpfCnpj,
                phone
            });
            
            toast.success('Assinatura processada com sucesso!');
            toast('Redirecionando para o Asaas...', { icon: '💳' });
            
            setTimeout(() => {
                window.location.href = res.data.invoiceUrl;
            }, 2000);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao gerar assinatura. Tente novamente.');
            setIsSubmitting(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
    };

    const getMonthlyEquivalent = (price: number, cycle: string) => {
        let months = 1;
        if (cycle === 'QUARTERLY') months = 3;
        if (cycle === 'SEMIANNUALLY') months = 6;
        if (cycle === 'YEARLY') months = 12;
        
        if (months === 1) return null;
        return formatPrice(price / months) + '/mês';
    };

    const filteredPlans = plans.filter(p => p.billingCycle === cycle).sort((a, b) => a.price - b.price);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-[var(--text-secondary)] font-semibold">Carregando planos de assinatura...</h2>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-12">
            {/* Cabeçalho */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">
                    Escolha o plano ideal para sua <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-600">operação de vendas</span>
                </h1>
                <p className="text-lg text-[var(--text-secondary)]">
                    Desbloqueie o poder máximo do WhatSaas. Diminua o custo por chip ao contratar planos maiores ou anuais.
                </p>
            </div>

            {/* Toggle de Periodicidade */}
            <div className="flex justify-center mt-8">
                <div className="glass-card p-1 rounded-2xl border border-[var(--border-color)] inline-flex">
                    {[
                        { id: 'MONTHLY', label: 'Mensal' },
                        { id: 'QUARTERLY', label: 'Trimestral (-10%)' },
                        { id: 'SEMIANNUALLY', label: 'Semestral (-15%)' },
                        { id: 'YEARLY', label: 'Anual (-20%)' }
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setCycle(opt.id)}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                                cycle === opt.id 
                                ? 'bg-[var(--primary)] text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid de Preços */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredPlans.map((plan) => {
                    const isPopular = plan.name === 'Pro'; // Destacar o plano Pro
                    const monthlyEq = getMonthlyEquivalent(plan.price, cycle);
                    
                    return (
                        <div 
                            key={plan.id} 
                            className={`relative rounded-3xl p-8 flex flex-col transition-transform duration-300 hover:-translate-y-2 ${
                                isPopular 
                                ? 'bg-[#0a0f12] border-2 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.15)] z-10 scale-105' 
                                : 'glass-card border border-[var(--border-color)]'
                            }`}
                        >
                            {isPopular && (
                                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                    <span className="bg-emerald-500 text-white text-xs font-black uppercase tracking-widest py-1 px-4 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                        Mais Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{plan.name}</h3>
                                <p className="text-[var(--text-muted)] text-sm">Ideal para operações em crescimento.</p>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-extrabold text-[var(--text-primary)]">{formatPrice(plan.price)}</span>
                                </div>
                                {monthlyEq && (
                                    <p className="text-emerald-400 text-sm font-semibold mt-1">
                                        Equivalente a {monthlyEq}
                                    </p>
                                )}
                            </div>

                            <div className="flex-1 space-y-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">✓</div>
                                    <span className="text-[var(--text-secondary)] font-medium">Até <strong className="text-[var(--text-primary)]">{plan.maxInstances} chips</strong> WhatsApp</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex shrink-0 items-center justify-center text-emerald-400 text-sm">✓</div>
                                    <span className="text-[var(--text-secondary)] font-medium">
                                        Disparos Ilimitados
                                        <span className="text-[10px] text-[var(--text-muted)] block leading-tight mt-0.5">Respeitando o algoritmo de Warmup do chip</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex shrink-0 items-center justify-center text-emerald-400 text-sm">✓</div>
                                    <span className="text-[var(--text-secondary)] font-medium">Auto Aquecimento (Warmup)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex shrink-0 items-center justify-center text-emerald-400 text-sm">✓</div>
                                    <span className="text-[var(--text-secondary)] font-medium">Respostas Inteligentes com IA</span>
                                </div>
                                
                                {plan.maxInstances >= 10 && (
                                    <div className="flex items-center gap-3 mt-4 p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex shrink-0 items-center justify-center text-cyan-400 text-sm z-10">🚀</div>
                                        <span className="text-cyan-400 font-bold text-sm z-10 leading-tight">Inclui conexão via API Oficial da Meta (WABA)</span>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => setCheckoutPlan(plan)}
                                className={`w-full py-4 rounded-xl font-bold transition-all ${
                                    isPopular 
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                                    : 'bg-[var(--bg-secondary)] hover:bg-white/10 text-[var(--text-primary)] border border-[var(--border-color)]'
                                }`}
                            >
                                Assinar Agora
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Checkout */}
            {checkoutPlan && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card border border-[var(--border-color)] p-8 rounded-3xl max-w-md w-full relative animate-fadeIn">
                        <button 
                            onClick={() => setCheckoutPlan(null)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                        
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                                🔒
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Checkout Seguro</h2>
                            <p className="text-[var(--text-secondary)]">Você está assinando o plano <strong>{checkoutPlan.name}</strong> por <strong>{formatPrice(checkoutPlan.price)}</strong>.</p>
                        </div>

                        <form onSubmit={handleSubscribe} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">CPF ou CNPJ (obrigatório para nota fiscal)</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    placeholder="000.000.000-00"
                                    value={cpfCnpj}
                                    onChange={(e) => setCpfCnpj(e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">WhatsApp para Contato (obrigatório)</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                                    placeholder="(11) 99999-9999"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                 />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full py-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-white transition-colors flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Gerando Fatura...
                                    </>
                                ) : (
                                    'Avançar para Pagamento →'
                                )}
                            </button>
                            <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                                Pagamentos processados com segurança máxima pelo Asaas Instituição de Pagamentos S.A.
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
