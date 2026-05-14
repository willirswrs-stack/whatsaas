'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const userJson = searchParams.get('user');

        if (accessToken && userJson) {
            try {
                // Save in client storage mimicking standard login behavior
                localStorage.setItem('accessToken', accessToken);
                if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
                
                // De-serialize user string safely
                const parsedUser = JSON.parse(decodeURIComponent(userJson));
                localStorage.setItem('user', JSON.stringify(parsedUser));
                
                console.log('OAuth Login Success! Redirecting...');
                
                // Force a full local reload / push to home
                window.location.href = '/'; 
            } catch (err) {
                console.error('OAuth persistence error', err);
                router.push('/login?error=parse_failed');
            }
        } else {
            console.warn('Incomplete OAuth Callback');
            router.push('/login?error=no_data');
        }
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-[#0f0c29] flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 border-4 border-t-cyan-400 border-transparent rounded-full animate-spin mb-6"></div>
            <h1 className="text-2xl font-bold tracking-wider">Finalizando Login Social...</h1>
            <p className="text-gray-400 mt-2">Preparando seu painel de controle.</p>
        </div>
    );
}
