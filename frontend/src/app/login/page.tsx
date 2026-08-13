'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage, authService } from '@/lib/auth';

export default function LoginPage() {
    const router = useRouter();
    const { login, register } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        companyName: '',
    });

    const [showForgotModal, setShowForgotModal] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryStep, setRecoveryStep] = useState(1);
    const [recoveryCode, setRecoveryCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [recoveryMessage, setRecoveryMessage] = useState('');

    const handleSendRecoveryCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recoveryEmail || !recoveryEmail.includes('@')) {
            alert('Informe um e-mail válido.');
            return;
        }
        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setRecoveryCode(code);
            setRecoveryStep(2);
            setRecoveryMessage(`Código de recuperação gerado para ${recoveryEmail}: [${code}]`);
        } catch (err: any) {
            alert('Erro ao enviar código de recuperação.');
        }
    };

    const handleSaveNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            alert('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('As senhas não coincidem.');
            return;
        }
        try {
            await authService.resetPassword(recoveryEmail, newPassword);
            alert('🎉 Nova senha redefinida com sucesso! Você já pode realizar o login com a nova senha.');
            setShowForgotModal(false);
            setFormData(prev => ({ ...prev, email: recoveryEmail, password: newPassword }));
        } catch (err: any) {
            const msg = err.response?.data?.message || getErrorMessage(err) || 'Erro ao salvar nova senha.';
            alert(msg);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                await login({
                    email: formData.email,
                    password: formData.password,
                });
            } else {
                await register({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    companyName: formData.companyName,
                });
            }
            router.push('/');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ marginLeft: 0 }}>
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
            </div>

            <div className="glass-card p-10 w-full max-w-md relative z-10 my-8">
                {/* Logo */}
                <div className="text-center mb-10">
                    <img
                        src="/logo.png"
                        alt="WhatSaas"
                        className="h-32 w-auto max-w-[90%] mx-auto object-contain drop-shadow-[0_20px_20px_rgba(255,255,255,0.15)] mb-6 hover:scale-110 transition-transform duration-500"
                    />
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
                    </h2>
                    <p className="text-[var(--text-muted)]">
                        {isLogin ? 'Faça login para acessar sua conta' : 'Preencha os dados para começar'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-2">Seu Nome</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="João Silva"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required={!isLogin}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Nome da Empresa</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Minha Empresa LTDA"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    required={!isLogin}
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            className="input w-full"
                            placeholder="seu@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium">Senha</label>
                            {isLogin && (
                                <button
                                    type="button"
                                    onClick={() => { setShowForgotModal(true); setRecoveryStep(1); setRecoveryEmail(formData.email); }}
                                    className="text-xs text-emerald-400 hover:underline font-medium cursor-pointer"
                                >
                                    🔑 Esqueci minha senha
                                </button>
                            )}
                        </div>
                        <input
                            type="password"
                            className="input w-full"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full mt-6"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processando...
                            </span>
                        ) : (
                            isLogin ? 'Entrar' : 'Criar Conta'
                        )}
                    </button>
                </form>

                {/* Toggle Login/Register */}
                <div className="mt-6 text-center">
                    <button
                        type="button"
                        className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                    >
                        {isLogin ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
                    </button>
                </div>
            </div>

            {/* FORGOT PASSWORD MODAL */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                        <div className="flex justify-between items-center mb-4 border-b border-[var(--border-color)] pb-3">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                🔑 Recuperar / Gerar Nova Senha
                            </h3>
                            <button onClick={() => setShowForgotModal(false)} className="text-[var(--text-muted)] hover:text-white text-xl">&times;</button>
                        </div>

                        {recoveryStep === 1 && (
                            <form onSubmit={handleSendRecoveryCode} className="space-y-4">
                                <p className="text-xs text-[var(--text-muted)]">Digite o seu e-mail de cadastro para receber o código de recuperação:</p>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">E-mail Cadastrado</label>
                                    <input
                                        type="email"
                                        required
                                        value={recoveryEmail}
                                        onChange={(e) => setRecoveryEmail(e.target.value)}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500"
                                        placeholder="seu-email@empresa.com"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setShowForgotModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] border border-[var(--border-color)]">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500">Enviar Código ➔</button>
                                </div>
                            </form>
                        )}

                        {recoveryStep === 2 && (
                            <div className="space-y-4">
                                <p className="text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 font-mono">{recoveryMessage}</p>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Código de 6 dígitos</label>
                                    <input
                                        type="text"
                                        value={recoveryCode}
                                        onChange={(e) => setRecoveryCode(e.target.value)}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-center text-lg font-bold tracking-widest text-[var(--text-primary)] outline-none"
                                    />
                                </div>
                                <div className="flex justify-between gap-2 pt-2">
                                    <button type="button" onClick={() => setRecoveryStep(1)} className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] border border-[var(--border-color)]">⬅ Voltar</button>
                                    <button type="button" onClick={() => setRecoveryStep(3)} className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500">Validar Código ➔</button>
                                </div>
                            </div>
                        )}

                        {recoveryStep === 3 && (
                            <form onSubmit={handleSaveNewPassword} className="space-y-4">
                                <p className="text-xs text-[var(--text-muted)]">Crie a sua nova senha de acesso:</p>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Nova Senha</label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Confirmar Nova Senha</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500"
                                        placeholder="Repita a nova senha"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setShowForgotModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] border border-[var(--border-color)]">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500">Salvar & Entrar ✨</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
