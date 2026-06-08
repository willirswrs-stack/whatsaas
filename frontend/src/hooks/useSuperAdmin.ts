'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Hook para verificar se o usuário atual é Super Admin.
 * Também pode redirecionar automaticamente se `redirect: true`.
 */
export function useSuperAdmin(options?: { redirect?: boolean; redirectTo?: string }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const isSuperAdmin = user?.role === 'super_admin';

    useEffect(() => {
        if (!isLoading && options?.redirect && !isSuperAdmin) {
            router.push(options?.redirectTo || '/');
        }
    }, [user, isLoading, isSuperAdmin, options?.redirect, options?.redirectTo, router]);

    return { isSuperAdmin, isLoading, user };
}
