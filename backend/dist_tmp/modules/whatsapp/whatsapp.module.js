"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const waha_adapter_1 = require("./adapters/waha.adapter");
const evolution_adapter_1 = require("./adapters/evolution.adapter");
const whatsapp_provider_factory_1 = require("./whatsapp-provider.factory");
/**
 * WhatsApp Module
 * Provides WhatsApp provider adapters (WAHA, Evolution)
 *
 * @Global so it can be injected anywhere without importing
 */
let WhatsAppModule = class WhatsAppModule {
};
exports.WhatsAppModule = WhatsAppModule;
exports.WhatsAppModule = WhatsAppModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            waha_adapter_1.WahaAdapter,
            evolution_adapter_1.EvolutionAdapter,
            whatsapp_provider_factory_1.WhatsAppProviderFactory,
        ],
        exports: [
            waha_adapter_1.WahaAdapter,
            evolution_adapter_1.EvolutionAdapter,
            whatsapp_provider_factory_1.WhatsAppProviderFactory,
        ],
    })
], WhatsAppModule);
