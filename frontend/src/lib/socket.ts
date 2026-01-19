import { io, Socket } from 'socket.io-client';

let socket: Socket | undefined;

// Obter URL da API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3333';

export const connectSocket = () => {
    if (typeof window === 'undefined') return undefined; // Server-side guard

    if (!socket) {
        const token = localStorage.getItem('accessToken');
        if (!token) return undefined;

        // Conectar diretamento ao namespace 'events' na URL base do backend
        const namespaceUrl = `${SOCKET_URL}/events`;

        socket = io(namespaceUrl, {
            auth: { token },
            transports: ['polling', 'websocket'], // Tenta polling primeiro, depois upgrade para websocket (mais robusto)
            withCredentials: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });

        socket.on('connect', () => {
            console.log('🔌 Socket connected:', socket?.id);
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });

        socket.on('connect_error', (err) => {
            console.error('🔌 Socket connection error:', err.message);
        });
    }
    else if (!socket.connected) {
        const token = localStorage.getItem('accessToken');
        if (token) {
            socket.auth = { token };
            socket.connect();
        }
    }

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = undefined;
    }
};
