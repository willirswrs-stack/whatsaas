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
var WhatsAppProviderFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppProviderFactory = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const waha_adapter_1 = require("./adapters/waha.adapter");
const evolution_adapter_1 = require("./adapters/evolution.adapter");
/**
 * WhatsApp Provider Factory
 * Returns the appropriate provider adapter based on type
 */
let WhatsAppProviderFactory = WhatsAppProviderFactory_1 = class WhatsAppProviderFactory {
    moduleRef;
    wahaAdapter;
    evolutionAdapter;
    logger = new common_1.Logger(WhatsAppProviderFactory_1.name);
    providers = new Map();
    constructor(moduleRef, wahaAdapter, evolutionAdapter) {
        this.moduleRef = moduleRef;
        this.wahaAdapter = wahaAdapter;
        this.evolutionAdapter = evolutionAdapter;
        this.providers.set('waha', wahaAdapter);
        this.providers.set('evolution', evolutionAdapter);
        this.providers.set('mobile_farm', evolutionAdapter);
        this.providers.set('antidetect', evolutionAdapter);
    }
    /**
     * Get provider by type
     */
    getProvider(providerType) {
        const provider = this.providers.get(providerType);
        if (!provider) {
            this.logger.error(`Unknown provider type: ${providerType}`);
            throw new Error(`Unknown WhatsApp provider: ${providerType}`);
        }
        this.logger.debug(`Using provider: ${providerType}`);
        return provider;
    }
    /**
     * Get all available provider types
     */
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
    /**
     * Check if a provider is available
     */
    isProviderAvailable(providerType) {
        return this.providers.has(providerType);
    }
};
exports.WhatsAppProviderFactory = WhatsAppProviderFactory;
exports.WhatsAppProviderFactory = WhatsAppProviderFactory = WhatsAppProviderFactory_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.ModuleRef,
        waha_adapter_1.WahaAdapter,
        evolution_adapter_1.EvolutionAdapter])
], WhatsAppProviderFactory);
