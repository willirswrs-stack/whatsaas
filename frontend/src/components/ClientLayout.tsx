'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Sidebar } from './Sidebar';
import { ProtectedRoute } from './ProtectedRoute';

import { OnboardingAssistant } from './onboarding/OnboardingAssistant';

// Rotas públicas que não precisam de autenticação
const publicRoutes = ['/login'];

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isPublicRoute = publicRoutes.includes(pathname);

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
                    </ProtectedRoute>
                )}
            </AuthProvider>
        </ThemeProvider>
    );
}
