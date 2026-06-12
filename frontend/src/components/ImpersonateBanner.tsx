'use client';

import { useState, useEffect } from 'react';

export function ImpersonateBanner() {
    const [impersonating, setImpersonating] = useState(false);
    const [targetUserName, setTargetUserName] = useState('');

    useEffect(() => {
        const adminToken = localStorage.getItem('admin_accessToken');
        const userStr = localStorage.getItem('user');
        if (adminToken && userStr) {
            setImpersonating(true);
            document.documentElement.classList.add('has-impersonate-banner');
            try {
                const userObj = JSON.parse(userStr);
                setTargetUserName(userObj.name || userObj.email || '');
            } catch (e) {
                setTargetUserName('Usuário');
            }
        } else {
            document.documentElement.classList.remove('has-impersonate-banner');
        }
        return () => {
            document.documentElement.classList.remove('has-impersonate-banner');
        };
    }, []);

    const handleStopImpersonating = () => {
        const adminToken = localStorage.getItem('admin_accessToken');
        const adminRefreshToken = localStorage.getItem('admin_refreshToken');
        const adminUser = localStorage.getItem('admin_user');

        if (adminToken) {
            localStorage.setItem('accessToken', adminToken);
            if (adminRefreshToken) localStorage.setItem('refreshToken', adminRefreshToken);
            if (adminUser) localStorage.setItem('user', adminUser);

            // Limpar chaves de backup
            localStorage.removeItem('admin_accessToken');
            localStorage.removeItem('admin_refreshToken');
            localStorage.removeItem('admin_user');

            document.documentElement.classList.remove('has-impersonate-banner');

            alert('🔄 Voltando para a sessão de Administrador...');
            window.location.href = '/admin/tenants';
        }
    };

    if (!impersonating) return null;

    return (
        <div 
            className="fixed top-0 left-0 right-0 h-[44px] bg-red-950 border-b border-red-500/30 text-white px-6 py-2 flex flex-row items-center justify-between gap-3 shadow-lg z-[9999]"
            style={{ backdropFilter: 'blur(10px)' }}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <span className="animate-pulse text-base flex-shrink-0">⚠️</span>
                <p className="text-xs font-medium text-red-100 truncate">
                    <strong className="text-red-400 font-bold uppercase tracking-wider mr-1.5">Atenção:</strong> 
                    Todas as ações executadas após personificar serão realizadas como se fossem do usuário personificado - <strong className="text-white bg-red-900/60 px-2 py-0.5 rounded border border-red-700/50 font-black">{targetUserName.toUpperCase()}</strong>
                </p>
            </div>
            <button
                onClick={handleStopImpersonating}
                className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-lg shadow transition-all whitespace-nowrap hover:scale-[1.03] active:scale-[0.97] flex items-center gap-1 border border-red-500 flex-shrink-0"
            >
                🔙 Voltar ao painel de Admin
            </button>
        </div>
    );
}
