import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { IProxyProvider } from './proxy-provider.interface';

@Injectable()
export class WebshareAdapter implements IProxyProvider {
    private readonly logger = new Logger(WebshareAdapter.name);
    private readonly apiKey: string;

    constructor() {
        this.apiKey = process.env.WEBSHARE_API_KEY || '';
    }

    async buyOrAllocateProxy(tenantId: string, currentProxies: any[]): Promise<{
        host: string;
        port: string;
        username?: string;
        password?: string;
        provider: string;
        type: string;
    }> {
        this.logger.log(`[WEBSHARE ADAPTER] Iniciando alocação do pool Webshare para tenant ${tenantId}`);

        if (!this.apiKey) {
            this.logger.warn(`[WEBSHARE ADAPTER] API Key da Webshare não configurada no arquivo .env!`);
            throw new BadRequestException(
                'A chave de API da Webshare (WEBSHARE_API_KEY) não está configurada no arquivo .env do servidor. Por favor, adicione-a para habilitar a alocação de proxies.'
            );
        }

        try {
            // Hita a API v2 da Webshare para obter a lista de proxies em formato direto (IP:Porta)
            const response = await axios.get('https://proxy.webshare.io/api/v2/proxy/list/', {
                params: {
                    mode: 'direct',
                    page_size: 100 // Limite de 100 proxies para a listagem
                },
                headers: {
                    'Authorization': `Token ${this.apiKey}`
                },
                timeout: 8000
            });

            const webshareProxies = response.data?.results || [];

            if (webshareProxies.length === 0) {
                throw new BadRequestException(
                    'Nenhum proxy ativo foi encontrado na sua conta Webshare. Certifique-se de que você possui proxies configurados em seu painel webshare.io.'
                );
            }

            this.logger.log(`[WEBSHARE ADAPTER] Encontrados ${webshareProxies.length} proxies no pool da Webshare.`);

            // Filtrar proxies obtidos da API da Webshare que já estejam registrados localmente em WhatSaas para evitar duplicidade de IPs
            const usedHostsPorts = new Set(currentProxies.map(p => `${p.host}:${p.port}`));

            // Selecionar o primeiro proxy retornado que ainda não existe no nosso banco de dados
            const availableProxy = webshareProxies.find((p: any) => !usedHostsPorts.has(`${p.proxy_address}:${p.port}`));

            if (availableProxy) {
                this.logger.log(`[WEBSHARE ADAPTER] Alocando novo proxy livre do pool: ${availableProxy.proxy_address}:${availableProxy.port}`);
                return {
                    host: availableProxy.proxy_address,
                    port: String(availableProxy.port),
                    username: availableProxy.username,
                    password: availableProxy.password,
                    provider: 'webshare',
                    type: 'socks5' // SOCKS5 é altamente otimizado e recomendado para Whatsapp
                };
            }

            // Caso todos os proxies já estejam vinculados a instâncias ativas do tenant
            this.logger.warn(`[WEBSHARE ADAPTER] Erro: Pool de proxies esgotado no Webshare (Todos os ${webshareProxies.length} IPs em uso).`);
            throw new BadRequestException(
                `Seu pool de proxies no Webshare (${webshareProxies.length} IPs) foi totalmente esgotado. Por favor, adicione mais proxies no seu painel webshare.io ou libere IPs desativando instâncias antigas.`
            );

        } catch (error: any) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`[WEBSHARE ADAPTER] Erro ao consultar API da Webshare: ${error.message}`);
            throw new BadRequestException(
                `Falha na comunicação com a API da Webshare: ${error.response?.data?.detail || error.message}`
            );
        }
    }
}
