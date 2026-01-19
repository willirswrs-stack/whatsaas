import api, { getErrorMessage } from './api';

// Tipos
export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    name: string;
    companyName: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

// Demo Mode - dados mock para testar sem backend
const DEMO_MODE = false; // Desativado - usando backend real

const createDemoResponse = (email: string, name?: string): AuthResponse => ({
    user: {
        id: 'demo-user-001',
        email: email,
        name: name || email.split('@')[0],
        role: 'admin',
        tenantId: 'demo-tenant-001',
    },
    accessToken: 'demo-access-token-' + Date.now(),
    refreshToken: 'demo-refresh-token-' + Date.now(),
});

// Funções de autenticação
export const authService = {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            const response = await api.post<AuthResponse>('/auth/login', credentials);

            // Salvar tokens
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            localStorage.removeItem('demoMode');

            return response.data;
        } catch (error: any) {
            // Se modo demo estiver ativo e houver erro de conexão, usar dados mock
            if (DEMO_MODE && (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error'))) {
                console.warn('🎭 Demo Mode: Backend não disponível, usando dados mock');
                const demoResponse = createDemoResponse(credentials.email);

                localStorage.setItem('accessToken', demoResponse.accessToken);
                localStorage.setItem('refreshToken', demoResponse.refreshToken);
                localStorage.setItem('user', JSON.stringify(demoResponse.user));
                localStorage.setItem('demoMode', 'true');

                return demoResponse;
            }
            throw error;
        }
    },

    async register(data: RegisterData): Promise<AuthResponse> {
        try {
            const response = await api.post<AuthResponse>('/auth/register', data);

            // Salvar tokens após registro
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            localStorage.removeItem('demoMode');

            return response.data;
        } catch (error: any) {
            // Se modo demo estiver ativo e houver erro de conexão, usar dados mock
            if (DEMO_MODE && (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error'))) {
                console.warn('🎭 Demo Mode: Backend não disponível, usando dados mock');
                const demoResponse = createDemoResponse(data.email, data.name);

                localStorage.setItem('accessToken', demoResponse.accessToken);
                localStorage.setItem('refreshToken', demoResponse.refreshToken);
                localStorage.setItem('user', JSON.stringify(demoResponse.user));
                localStorage.setItem('demoMode', 'true');

                return demoResponse;
            }
            throw error;
        }
    },

    logout(): void {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
    },

    getStoredUser(): User | null {
        if (typeof window === 'undefined') return null;
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    },

    getAccessToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('accessToken');
    },

    isAuthenticated(): boolean {
        return !!this.getAccessToken();
    },
};

export { getErrorMessage };
