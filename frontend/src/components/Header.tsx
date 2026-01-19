'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const isHome = pathname === '/';

    return (
        <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                {/* Botão Voltar */}
                {!isHome && (
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-[var(--bg-glass)] transition-colors"
                        title="Voltar"
                    >
                        <svg className="w-5 h-5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}

                {/* Busca */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="input w-80 pl-10"
                    />
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </div>
            </div>
        </header>
    );
}
