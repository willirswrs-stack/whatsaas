'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Nav items with icon paths
const navItems = [
    { href: '/', label: 'Dashboard', icon: '/icons/sidebar/dashboard.png' },
    { href: '/inbox', label: 'Inbox', icon: '/icons/sidebar/contacts.png' },
    { href: '/campaigns', label: 'Campanhas', icon: '/icons/sidebar/campaigns.png' },
    { href: '/flows', label: 'Fluxos', icon: '/icons/sidebar/flows.png' },
    { href: '/chips', label: 'Chips', icon: '/icons/sidebar/chips.png' },
    { href: '/templates', label: 'Templates', icon: '/icons/sidebar/templates.png' },
    { href: '/templates-meta', label: 'Templates Meta', icon: '/icons/sidebar/templates_meta.png' },
    { href: '/contatos', label: 'Contatos', icon: '/icons/sidebar/contacts.png' },
    { href: '/proxies', label: 'Proxies', icon: '/icons/sidebar/proxies.png' },
    { href: '/ai-spinner', label: 'AI Spinner', icon: '/icons/sidebar/ai_spinner.png' },
    { href: '/antiban', label: 'Anti-Ban', icon: '/icons/sidebar/dashboard.png' },
    { href: '/warmup', label: 'Warm-up', icon: '/icons/sidebar/warmup.png' },
    { href: '/analytics', label: 'Analytics', icon: '/icons/sidebar/analytics.png' },
    { href: '/configuracoes', label: 'Configurações', icon: '/icons/sidebar/settings.png' },
];


export function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin';

    // Se o usuário não estiver carregado ainda, não mostrar nada ou mostrar links padrão
    // O navItems já está definido fora.

    return (
        <aside className="sidebar flex flex-col h-full bg-[#1e2330] border-r border-[#2d3241]">
            <div className="sidebar-logo p-2 flex justify-center border-b border-[#2d3241] min-h-[140px] items-center overflow-hidden">
                <Link href="/" className="flex items-center w-full justify-center p-1">
                    <img
                        src="/logo.png"
                        alt="WhatSaas"
                        className="w-full max-w-[210px] object-contain drop-shadow-[0_0_15px_rgba(37,211,102,0.5)] hover:scale-105 transition-all duration-300"
                        style={{ height: '110px', width: 'auto' }}
                    />
                </Link>
            </div>

            <nav className="sidebar-nav flex-1 overflow-y-auto py-4 space-y-1 px-3">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${isActive ? 'active' : ''} flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2d3241] transition-colors`}
                        >
                            <img
                                src={item.icon}
                                alt={item.label}
                                className="w-6 h-6 object-contain"
                            />
                            <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                    );
                })}

                {/* Área de Super Admin */}
                {isSuperAdmin && (
                    <div className="mt-6 pt-4 border-t border-[#2d3241]">
                        <p className="px-4 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">
                            Super Admin
                        </p>
                        <Link
                            href="/admin/dashboard"
                            className={`nav-item ${pathname === '/admin/dashboard' ? 'active' : ''} flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2d3241] transition-colors group`}
                        >
                            <div className="w-6 h-6 flex items-center justify-center bg-cyan-500/10 rounded-md group-hover:bg-cyan-500/20 text-cyan-400">
                                🖥️
                            </div>
                            <span className="text-sm font-medium">Dashboard Global</span>
                        </Link>
                        <Link
                            href="/admin/tenants"
                            className={`nav-item ${pathname === '/admin/tenants' ? 'active' : ''} flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2d3241] transition-colors group`}
                        >
                            <div className="w-6 h-6 flex items-center justify-center bg-emerald-500/10 rounded-md group-hover:bg-emerald-500/20 text-emerald-400">
                                🏢
                            </div>
                            <span className="text-sm font-medium">Tenants (Clientes)</span>
                        </Link>
                        <Link
                            href="/admin/logs"
                            className={`nav-item ${pathname === '/admin/logs' ? 'active' : ''} flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2d3241] transition-colors group`}
                        >
                            <div className="w-6 h-6 flex items-center justify-center bg-yellow-500/10 rounded-md group-hover:bg-yellow-500/20 text-yellow-400">
                                📜
                            </div>
                            <span className="text-sm font-medium">Logs do Servidor</span>
                        </Link>
                        <a
                            href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/admin/queues` || 'http://localhost:3333/admin/queues'}
                            target="_blank"
                            rel="noreferrer"
                            className="nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2d3241] transition-colors group"
                        >
                            <div className="w-6 h-6 flex items-center justify-center bg-red-500/10 rounded-md group-hover:bg-red-500/20 text-red-400">
                                📊
                            </div>
                            <span className="text-sm font-medium flex items-center gap-1">
                                Filas BullMQ
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                            </span>
                        </a>
                        <Link
                            href="/admin/ai-agent"
                            className={`nav-item ${pathname === '/admin/ai-agent' ? 'active' : ''} flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2d3241] transition-colors group`}
                        >
                            <div className="w-6 h-6 flex items-center justify-center bg-indigo-500/10 rounded-md group-hover:bg-indigo-500/20 text-indigo-400">
                                🤖
                            </div>
                            <span className="text-sm font-medium">Configurar IA</span>
                        </Link>
                    </div>
                )}
            </nav>

            <div className="px-4 py-4 border-t border-[#2d3241]">
                <div className="glass-card p-4">
                    <UserSection />
                </div>
            </div>
        </aside>
    );
}


function UserSection() {
    const { user, logout } = useAuth();

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{user?.name || 'Usuário'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{user?.email || 'email@exemplo.com'}</p>
                </div>
            </div>
            <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-[var(--bg-glass)] transition-colors"
                title="Sair"
            >
                <svg className="w-5 h-5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16,17 21,12 16,7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
            </button>
        </div>
    );
}
