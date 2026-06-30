"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var WebshareAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebshareAdapter = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let WebshareAdapter = WebshareAdapter_1 = class WebshareAdapter {
    logger = new common_1.Logger(WebshareAdapter_1.name);
    apiKey;
    constructor() {
        this.apiKey = process.env.WEBSHARE_API_KEY || '';
    }
    async buyOrAllocateProxy(tenantId, currentProxies) {
        this.logger.log(`[WEBSHARE ADAPTER] Iniciando alocação do pool Webshare para tenant ${tenantId}`);
        if (!this.apiKey) {
            this.logger.warn(`[WEBSHARE ADAPTER] API Key da Webshare não configurada no arquivo .env!`);
            throw new common_1.BadRequestException('A chave de API da Webshare (WEBSHARE_API_KEY) não está configurada no arquivo .env do servidor. Por favor, adicione-a para habilitar a alocação de proxies.');
        }
        try {
            // Hita a API v2 da Webshare para obter a lista de proxies em formato direto (IP:Porta)
            const response = await axios_1.default.get('https://proxy.webshare.io/api/v2/proxy/list/', {
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
                throw new common_1.BadRequestException('Nenhum proxy ativo foi encontrado na sua conta Webshare. Certifique-se de que você possui proxies configurados em seu painel webshare.io.');
            }
            this.logger.log(`[WEBSHARE ADAPTER] Encontrados ${webshareProxies.length} proxies no pool da Webshare.`);
            // Filtrar proxies obtidos da API da Webshare que já estejam registrados localmente em WhatSaas para evitar duplicidade de IPs
            const usedHostsPorts = new Set(currentProxies.map(p => `${p.host}:${p.port}`));
            // Selecionar o primeiro proxy retornado que ainda não existe no nosso banco de dados
            const availableProxy = webshareProxies.find((p) => !usedHostsPorts.has(`${p.proxy_address}:${p.port}`));
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
            throw new common_1.BadRequestException(`Seu pool de proxies no Webshare (${webshareProxies.length} IPs) foi totalmente esgotado. Por favor, adicione mais proxies no seu painel webshare.io ou libere IPs desativando instâncias antigas.`);
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`[WEBSHARE ADAPTER] Erro ao consultar API da Webshare: ${error.message}`);
            throw new common_1.BadRequestException(`Falha na comunicação com a API da Webshare: ${error.response?.data?.detail || error.message}`);
        }
    }
};
exports.WebshareAdapter = WebshareAdapter;
exports.WebshareAdapter = WebshareAdapter = WebshareAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], WebshareAdapter);
