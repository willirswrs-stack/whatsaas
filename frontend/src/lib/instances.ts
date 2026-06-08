import api from './api';

// Tipos
export type ProviderType = 'waha' | 'evolution';  // WWebJS removido por instabilidade

export interface Instance {
    id: string;
    instanceName: string;  // Backend field name
    name?: string;         // Alias for compatibility
    phone: string;         // Backend field name
    phoneNumber?: string;  // Alias for compatibility
    status: 'connecting' | 'connected' | 'disconnected' | 'banned';
    warmupDay: number;     // Backend field name
    warmupEnabled?: boolean; // Whether warmup is active
    isSystemSeed?: boolean; // Whether it is a system seed chip
    warmupProfile?: 'inbound' | 'warm_outbound' | 'cold_outbound' | 'groups';
    warmupProgress?: number; // Alias for compatibility
    dailyLimit: number;
    dailySent: number;     // Backend field name
    messagesSent?: number; // Alias for compatibility
    healthScore?: number;  // Calculated health score 0-100
    provider?: ProviderType;
    proxy?: {
        id: string;
        host: string;
    };
    metaConfig?: Record<string, any>;
    qrCode?: string;
    createdAt: string;
}

export interface CreateInstanceDto {
    name: string;
    proxyId?: string;
    provider?: ProviderType;
    warmupProfile?: 'inbound' | 'warm_outbound' | 'cold_outbound' | 'groups';
}

export interface Proxy {
    id: string;
    host: string;
    port: number;
    username?: string;
    type: 'http' | 'socks5';
    status: 'active' | 'inactive';
    latency?: number;
}

// Demo Mode - dados mock
const isDemoMode = () => typeof window !== 'undefined' && localStorage.getItem('demoMode') === 'true';

const DEMO_INSTANCES: Instance[] = [
    {
        id: 'demo-inst-001',
        instanceName: 'Chip Principal',
        phone: '+55 11 99999-0001',
        status: 'connected',
        warmupDay: 14,
        dailyLimit: 100,
        dailySent: 47,
        proxy: { id: 'proxy-001', host: 'br-proxy.example.com' },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'demo-inst-002',
        instanceName: 'Chip Vendas',
        phone: '+55 11 98888-0002',
        status: 'connected',
        warmupDay: 14,
        dailyLimit: 80,
        dailySent: 23,
        proxy: { id: 'proxy-002', host: 'sp-proxy.example.com' },
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'demo-inst-003',
        instanceName: 'Chip Suporte',
        phone: '+55 21 97777-0003',
        status: 'connecting',
        warmupDay: 5,
        dailyLimit: 25,
        dailySent: 12,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'demo-inst-004',
        instanceName: 'Chip Marketing',
        phone: '+55 31 96666-0004',
        status: 'disconnected',
        warmupDay: 0,
        dailyLimit: 10,
        dailySent: 0,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
];

let demoInstancesState = [...DEMO_INSTANCES];

// QR Code mock (base64 de um QR code simples)
const DEMO_QR_CODE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAklEQVR4AewaftIAAAdhSURBVO3BQY4cRxAEwfAC//9l3znGqWBBr9SzCsJ+wFreoMo1VOKQ3n77g+ey7oS1vFyVa6hEIxLpcIR1p4V/n3Un7HQnrOWlqlxDJRqRSIcjrDst/Pus O2GnO2EtL1XlGirRiEQ6HGHdaeHfZ90JO90Ja3mpKtdQiUYk0uEI604L/z7rTtjpTljLS1W5hko0IpEOR1h3Wvj3WXfCTnfCWl6qyjVUohGJdDjCutPCv8+6E3a6E9byUlWuoRKNSKTDEdadFv591p2w052wlpeqcg2VaEQiHY6w7rQAwAAAi3UnrOWlqlxDJRqRSIcjrDst/PusO2GnO2EtL1XlGirRiEQ6HGHdaeHfZ90JO90Ja3mpKtdQiUYk0uEI604L/z7rTtjpTljLS1W5hko0IpEOR1h3WsAAAgCsOy2sO2EtL1XlGirRiEQ6HGHdaQEDCAC w7rSw7oS1vFSVa6hEIxLpcIR1pwUMIADAuhPW8lJVrqESjUikwxHWnRYwgAAA604L605Yy0tVuYZKNCKRDkdYd1rAAAIArDstrDthLS9V5Roq0YhEOhxh3WkBAwgAsO60sO6EtbxUlWuoRCMS6XCEdacFDCAAwLrTwroT1vJSVa6hEo1IpMMR1p0WMIAAAOtOC+tOWMtLVbmGSjQikQ5HWHdawAACAKw7Law7YS0vVeUaKtGIRDocYd1pAQMIALDutLDuhLW8VJVrqEQjEulwhHWnBQwgAMC608K6E9byUlWuoRKNSKTDEdadFjCAAAAQ605Yy0tVuYZKNCKRDkdYd1oAAAA=';

// Serviços de Instâncias (Chips)
export const instancesService = {
    async list(): Promise<Instance[]> {
        if (isDemoMode()) {
            console.log('🎭 Demo Mode: Retornando instâncias mock');
            return demoInstancesState;
        }
        const response = await api.get<Instance[]>('/instances');
        return response.data;
    },

    async get(id: string): Promise<Instance> {
        if (isDemoMode()) {
            const instance = demoInstancesState.find(i => i.id === id);
            if (!instance) throw new Error('Instância não encontrada');
            return instance;
        }
        const response = await api.get<Instance>(`/instances/${id}`);
        return response.data;
    },

    async create(data: CreateInstanceDto): Promise<{ instance: Instance; qrCode?: string }> {
        if (isDemoMode()) {
            console.log('🎭 Demo Mode: Criando instância mock');
            const newInstance: Instance = {
                id: 'demo-inst-' + Date.now(),
                instanceName: data.name,
                phone: 'Aguardando...',
                status: 'connecting',
                warmupDay: 0,
                dailyLimit: 10,
                dailySent: 0,
                createdAt: new Date().toISOString(),
            };
            demoInstancesState = [...demoInstancesState, newInstance];
            return { instance: newInstance, qrCode: DEMO_QR_CODE };
        }
        // Sanitizar nome: remover caracteres especiais, substituir espaços por hífens
        const sanitizedName = data.name
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9-]/g, '-') // Substitui não-alfanuméricos por hífen
            .replace(/-+/g, '-') // Multiple hífens -> um hífen
            .replace(/^-|-$/g, ''); // Remove hífens no início/fim

        const response = await api.post<any>('/instances', {
            instanceName: sanitizedName,
            proxyId: data.proxyId,
            provider: data.provider || 'evolution',  // Evolution como padrão
            warmupProfile: data.warmupProfile || 'cold_outbound'
        });
        return response.data;
    },

    async getProviders(): Promise<{ providers: ProviderType[] }> {
        if (isDemoMode()) {
            return { providers: ['evolution', 'waha'] };  // WWebJS removido
        }
        const response = await api.get<{ providers: ProviderType[] }>('/instances/providers');
        return response.data;
    },

    async getQrCode(id: string): Promise<{ qrCode: string }> {
        if (isDemoMode()) {
            console.log('🎭 Demo Mode: Retornando QR Code mock');
            return { qrCode: DEMO_QR_CODE };
        }
        const response = await api.get<{ qrCode: string }>(`/instances/${id}/qr`);
        return response.data;
    },

    async getPairingCode(id: string, phoneNumber: string): Promise<{ pairingCode: string; phone: string }> {
        if (isDemoMode()) {
            console.log('🎭 Demo Mode: Retornando Pairing Code mock');
            return { pairingCode: 'A1B2-C3D4', phone: phoneNumber.replace(/\D/g, '') };
        }
        const response = await api.post<{ pairingCode: string; phone: string }>(`/instances/${id}/pairing-code`, { phoneNumber });
        return response.data;
    },

    async delete(id: string): Promise<void> {
        if (isDemoMode()) {
            console.log('🎭 Demo Mode: Deletando instância mock');
            demoInstancesState = demoInstancesState.filter(i => i.id !== id);
            return;
        }
        await api.delete(`/instances/${id}`);
    },

    async update(id: string, data: Partial<Instance> & { proxyId?: string | null }): Promise<Instance> {
        if (isDemoMode()) {
            const index = demoInstancesState.findIndex((i) => i.id === id);
            if (index !== -1) {
                // Mock update proxy logic if needed
                if (data.proxyId) {
                    const proxy = (await instancesService.listProxies()).find(p => p.id === data.proxyId);
                    if (proxy) {
                        demoInstancesState[index] = { ...demoInstancesState[index], proxy: { id: proxy.id, host: proxy.host } };
                    }
                }
                demoInstancesState[index] = { ...demoInstancesState[index], ...data };
                return demoInstancesState[index];
            }
            throw new Error('Instância não encontrada');
        }
        const response = await api.patch<Instance>(`/instances/${id}`, data);
        return response.data;
    },

    async getStatus(id: string): Promise<{ instance: Instance; providerStatus: { status: string; phoneNumber?: string; name?: string } }> {
        if (isDemoMode()) {
            console.log('🎭 Demo Mode: Retornando status mock');
            const instance = demoInstancesState.find(i => i.id === id);
            // Simular conexão após 5 segundos
            if (instance && instance.status === 'connecting') {
                const elapsed = Date.now() - new Date(instance.createdAt).getTime();
                if (elapsed > 5000) {
                    instance.status = 'connected';
                    instance.phone = '+55 11 9' + Math.floor(Math.random() * 10000000).toString().padStart(8, '0');
                }
            }
            return {
                instance: instance!,
                providerStatus: { status: instance?.status || 'disconnected', phoneNumber: instance?.phone }
            };
        }
        const response = await api.get<{ instance: Instance; providerStatus: { status: string; phoneNumber?: string; name?: string } }>(`/instances/${id}/status`);
        return response.data;
    },

    // Proxies
    async listProxies(): Promise<Proxy[]> {
        if (isDemoMode()) {
            return [
                { id: 'proxy-001', host: 'br-proxy.example.com', port: 1080, type: 'socks5', status: 'active', latency: 45 },
                { id: 'proxy-002', host: 'sp-proxy.example.com', port: 1080, type: 'socks5', status: 'active', latency: 32 },
                { id: 'proxy-003', host: 'rj-proxy.example.com', port: 1080, type: 'socks5', status: 'inactive', latency: 120 },
            ];
        }
        const response = await api.get<Proxy[]>('/proxies');
        return response.data;
    },

    async createProxy(data: Omit<Proxy, 'id' | 'status' | 'latency'>): Promise<Proxy> {
        if (isDemoMode()) {
            return { ...data, id: 'proxy-' + Date.now(), status: 'active', latency: Math.floor(Math.random() * 100) };
        }
        const response = await api.post<Proxy>('/proxies', data);
        return response.data;
    },

    async toggleWarmup(id: string, enabled: boolean): Promise<Instance> {
        if (isDemoMode()) {
            const index = demoInstancesState.findIndex((i) => i.id === id);
            if (index !== -1) {
                demoInstancesState[index] = { ...demoInstancesState[index], warmupEnabled: enabled };
                return demoInstancesState[index];
            }
            throw new Error('Instância não encontrada');
        }
        const response = await api.patch<Instance>(`/instances/${id}/warmup`, { enabled });
        return response.data;
    },

    async getHealth(id: string): Promise<{ score: number; status: { status: string; emoji: string; recommendation: string; color: string } }> {
        if (isDemoMode()) {
            return { score: 75, status: { status: 'good', emoji: '🟡', recommendation: 'Boa saúde', color: '#84cc16' } };
        }
        const response = await api.get(`/instances/${id}/health`);
        return response.data;
    },
};
