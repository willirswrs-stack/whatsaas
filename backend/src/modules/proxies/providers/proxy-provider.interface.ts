export interface IProxyProvider {
    /**
     * Adquire ou aloca um proxy do pool do provedor.
     * @param tenantId ID da empresa/cliente.
     * @param currentProxies Lista de proxies já cadastrados no banco local para este tenant (usado para evitar duplicidade de alocação de IPs do pool).
     */
    buyOrAllocateProxy(tenantId: string, currentProxies: any[]): Promise<{
        host: string;
        port: string;
        username?: string;
        password?: string;
        provider: string;
        type: string;
    }>;
}
