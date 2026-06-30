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
var ProxyProviderFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyProviderFactory = void 0;
const common_1 = require("@nestjs/common");
const webshare_adapter_1 = require("./webshare.adapter");
const iproyal_adapter_1 = require("./iproyal.adapter");
let ProxyProviderFactory = ProxyProviderFactory_1 = class ProxyProviderFactory {
    webshareAdapter;
    iproyalAdapter;
    logger = new common_1.Logger(ProxyProviderFactory_1.name);
    constructor(webshareAdapter, iproyalAdapter) {
        this.webshareAdapter = webshareAdapter;
        this.iproyalAdapter = iproyalAdapter;
    }
    getProvider() {
        const providerName = (process.env.DEFAULT_PROXY_PROVIDER || 'webshare').toLowerCase();
        this.logger.log(`[PROXY FACTORY] Selecionando provedor ativo: ${providerName}`);
        if (providerName === 'iproyal') {
            return this.iproyalAdapter;
        }
        // Webshare por padrão
        return this.webshareAdapter;
    }
};
exports.ProxyProviderFactory = ProxyProviderFactory;
exports.ProxyProviderFactory = ProxyProviderFactory = ProxyProviderFactory_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [webshare_adapter_1.WebshareAdapter,
        iproyal_adapter_1.IPRoyalAdapter])
], ProxyProviderFactory);
