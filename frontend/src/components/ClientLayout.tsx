'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Sidebar } from './Sidebar';
import { ProtectedRoute } from './ProtectedRoute';

import { OnboardingAssistant } from './onboarding/OnboardingAssistant';
import { SupportWidget } from './SupportWidget';

// Rotas públicas que não precisam de autenticação
const publicRoutes = ['/login', '/landing'];

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // Remover trailing slash para comparação segura e verificar se começa com a rota
    const normalizedPath = pathname?.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const isPublicRoute = publicRoutes.some(route => normalizedPath === route || normalizedPath?.startsWith(route + '/'));

    return (
        <ThemeProvider>
            <AuthProvider>
                {isPublicRoute ? (
                    // Rotas públicas (login) - sem sidebar
                    <>{children}</>
                ) : (
                    // Rotas protegidas - com sidebar
                    <ProtectedRoute>
                        <Sidebar />
                        <main className="main-content">{children}</main>
                        <OnboardingAssistant />
                        <SupportWidget />
                    </ProtectedRoute>
                )}
            </AuthProvider>
        </ThemeProvider>
    );
}
