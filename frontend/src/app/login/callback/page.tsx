'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

function LoginCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get('code');
        
        // Legacy fallback
        const legacyAccessToken = searchParams.get('accessToken');
        const legacyRefreshToken = searchParams.get('refreshToken');
        const legacyUserJson = searchParams.get('user');

        const handleCallback = async () => {
            if (code) {
                try {
                    const response = await api.post('/auth/social/token', { code });
                    const { accessToken, refreshToken, user } = response.data;

                    localStorage.setItem('accessToken', accessToken);
                    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
                    localStorage.setItem('user', JSON.stringify(user));

                    console.log('OAuth Login Success! Redirecting...');
                    window.location.href = '/';
                } catch (err) {
                    console.error('OAuth token exchange error', err);
                    router.push('/login?error=social_failed');
                }
            } else if (legacyAccessToken && legacyUserJson) {
                try {
                    localStorage.setItem('accessToken', legacyAccessToken);
                    if (legacyRefreshToken) localStorage.setItem('refreshToken', legacyRefreshToken);
                    const parsedUser = JSON.parse(decodeURIComponent(legacyUserJson));
                    localStorage.setItem('user', JSON.stringify(parsedUser));
                    
                    console.log('Legacy OAuth Login Success! Redirecting...');
                    window.location.href = '/';
                } catch (err) {
                    console.error('Legacy OAuth persistence error', err);
                    router.push('/login?error=parse_failed');
                }
            } else {
                console.warn('Incomplete OAuth Callback');
                router.push('/login?error=no_data');
            }
        };

        handleCallback();
    }, [searchParams, router]);


    return (
        <div className="min-h-screen bg-[#0f0c29] flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 border-4 border-t-cyan-400 border-transparent rounded-full animate-spin mb-6"></div>
            <h1 className="text-2xl font-bold tracking-wider">Finalizando Login Social...</h1>
            <p className="text-gray-400 mt-2">Preparando seu painel de controle.</p>
        </div>
    );
}

export default function LoginCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0f0c29] flex flex-col items-center justify-center text-white">
                <div className="w-16 h-16 border-4 border-t-cyan-400 border-transparent rounded-full animate-spin mb-6"></div>
                <h1 className="text-2xl font-bold tracking-wider">Carregando login social...</h1>
            </div>
        }>
            <LoginCallbackContent />
        </Suspense>
    );
}

